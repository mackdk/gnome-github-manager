import { BoxLayout, Label, Icon } from '@gi-types/st1';
import { ActorAlign, CURRENT_TIME } from '@gi-types/clutter10';

import { icon_new_for_string } from '@gi-types/gio2';
import { show_uri } from '@gi-types/gtk4';

import { Status } from '@tshttp/status';

import { ApiError, GitHubClient, GitHubClientFactory, Notification } from '@github-manager/domain/GitHubClient';
import { Logger } from '@github-manager/utils/Logger';
import { Configuration } from './Configuration';

const Main: Main = imports.ui.main;
const Mainloop: MainLoop = imports.mainloop;
const MessageTray : MessageTray = imports.ui.messageTray;

const Me = imports.misc.extensionUtils.getCurrentExtension();

export class GitHubNotifications {
    private static readonly LOGGER: Logger = new Logger('github-manager.domain.GitHubNotifications');

    private timeout?: number;

    private gitHubClient?: GitHubClient;

    private notifications: Notification[];
    private retryAttempts: number;
    private retryIntervals: Array<number>;
    private hasLazilyInit: boolean;

    private source?: MessageTray.SystemNotificationSource;
    private configuration: Configuration;

    private readonly box: BoxLayout;
    private readonly label: Label;
    private readonly icon: Icon;

    public constructor(configuration: Configuration) {
        this.configuration = configuration;
        this.configuration.addChangeListener(this.configurationPropertyChanged.bind(this));
        this.notifications = [];

        this.retryAttempts = 0;
        this.retryIntervals = [60, 120, 240, 480, 960, 1920, 3600];
        this.hasLazilyInit = false;

        this.box = new BoxLayout({
            style_class: 'panel-button',
            reactive: true,
            can_focus: true,
            track_hover: true
        });
        this.label = new Label({
            text: `${this.notifications.length}`,
            style_class: 'system-status-icon notifications-length',
            y_align: ActorAlign.CENTER,
            y_expand: true,
        });
        this.icon = new Icon({
            style_class: 'system-status-icon'
        });
    }

    private interval(minAllowed: number) : number {
        let interval = this.configuration.refreshInterval;
        if (this.retryAttempts > 0) {
            interval = this.retryIntervals[this.retryAttempts] || 3600;
        }
        return Math.max(interval, minAllowed);
    }

    private lazyInit() {
        if (!this.configuration) {
            GitHubNotifications.LOGGER.warn('Unable to peform lazy init: extension settings are not initialized');
            return;
        }

        this.hasLazilyInit = true;
        this.initHttp();
        this.initUI();
    }

    private configurationPropertyChanged(property: string) {
        GitHubNotifications.LOGGER.debug(`Configuration property '${property}' is changed`);

        this.initHttp();
        this.stopLoop();
        this.planFetch(5, false);
    }

    public start() {
        if (!this.hasLazilyInit) {
            this.lazyInit();
        }
        this.fetchNotifications();
        Main.panel._rightBox.insert_child_at_index(this.box, 0);
    }

    public stop() {
        this.stopLoop();
        Main.panel._rightBox.remove_child(this.box);
    }

    private checkVisibility() {
        if (this.box) {
            this.box.visible = !this.configuration.hideWidget || this.notifications.length != 0;
        }
        if (this.label) {
            this.label.visible = !this.configuration.hideNotificationCount;
        }
    }

    private stopLoop() {
        if (this.timeout) {
            Mainloop.source_remove(this.timeout);
            this.timeout = undefined;
        }
    }

    private initUI() {
        this.checkVisibility();

        this.icon.gicon = icon_new_for_string(`${Me.path}/github.svg`);

        this.box.add_actor(this.icon);
        this.box.add_actor(this.label);

        this.box.connect('button-press-event', (_, event) => {
            const button: number = event.get_button();

            if (button == 1) {
                this.showBrowserUri();
            } else if (button == 3) {
                imports.misc.extensionUtils.openPrefs();
            }
        });
    }

    private showBrowserUri() {
        try {
            let url = `https://${this.configuration.domain}/notifications`;
            if (this.configuration.showParticipatingOnly) {
                url = `https://${this.configuration.domain}/notifications/participating`;
            }

            show_uri(null, url, CURRENT_TIME);
        } catch (e) {
            GitHubNotifications.LOGGER.error(`Cannot open uri ${e}`);
        }
    }

    private initHttp() {
        this.gitHubClient = GitHubClientFactory.newClient(this.configuration.domain, this.configuration.token);
    }

    private planFetch(delay: number, retry: boolean) {
        if (retry) {
            this.retryAttempts++;
        } else {
            this.retryAttempts = 0;
        }
        this.stopLoop();
        this.timeout = Mainloop.timeout_add_seconds(delay, () => {
            this.fetchNotifications();
            return false;
        });
        GitHubNotifications.LOGGER.debug(`Next fetch execution scheduled in ${delay} seconds`);
    }

    private fetchNotifications() {
        const client = this.gitHubClient;
        if (!client) {
            return;
        }

        GitHubNotifications.LOGGER.debug('Feching GitHub notifications');

        let failed = false;
        client.listNotifications(this.configuration.showParticipatingOnly).then((notifications: Notification[]) => {
            this.updateNotifications(notifications);
            failed = false;
        }).catch((error: ApiError) => {
            if (error.statusCode == Status.NotModified) {
                // Nothing to update, just reschedule
                failed == false;
            } else {
                GitHubNotifications.LOGGER.error(`HTTP error ${error.statusCode}: ${error.message}`, error.error);
                this.label.set_text('!');
                failed = true;
            }
        }).finally(() => {
            this.planFetch(this.interval(client.pollInterval), failed);
        });
    }

    private updateNotifications(data: Notification[]) {
        const lastNotificationsCount = this.notifications.length;

        this.notifications = data;
        this.label.set_text(`${data.length}`);
        this.checkVisibility();
        this.alertWithNotifications(lastNotificationsCount);
    }

    private alertWithNotifications(lastCount: number) {
        const newCount = this.notifications.length;

        if (newCount && newCount > lastCount && this.configuration.showAlert) {
            try {
                const message = `You have ${newCount} new notifications`;

                this.notify('Github Notifications', message);
            } catch (e) {
                GitHubNotifications.LOGGER.error(`Cannot notify ${e}`);
            }
        }
    }

    private notify(title: string, message: string) {
        if (!this.source) {
            this.source = new MessageTray.SystemNotificationSource();
            this.source.connect('destroy', () => {
                this.source = undefined;
            });

            Main.messageTray.add(this.source);
        }

        let notification : MessageTray.Notification;
        if (this.source.notifications.length == 0) {
            notification = new MessageTray.Notification(this.source, title, message, { gicon: this.icon.gicon });

            notification.setTransient(false);
            notification.connect('activated', this.showBrowserUri.bind(this)); // Open on click
        } else {
            notification = this.source.notifications[0];
            notification.update(title, message, { clear: true });
        }

        this.source.showNotification(notification);
    }
}
