import { BoxLayout, Label, Icon } from '@gi-types/st1';
import { ActorAlign, CURRENT_TIME } from '@gi-types/clutter10';

import { icon_new_for_string, Settings } from '@gi-types/gio2';
import { show_uri } from '@gi-types/gtk4';

import { Status } from '@tshttp/status';

import { ApiError, GitHubClient, GitHubClientFactory, Notification } from '@github-manager/domain/GitHubClient';
import { Logger } from '@github-manager/utils/Logger';

const Main: Main = imports.ui.main;
const Mainloop: MainLoop = imports.mainloop;
const MessageTray : MessageTray = imports.ui.messageTray;

const ExtensionUtils: ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

export class GitHubNotifications {
    private static readonly LOGGER: Logger = new Logger('github-manager.domain.GitHubNotifications');

    domain: string;
    token: string;
    handle: string;
    hideWidget: boolean;
    hideCount: boolean;
    refreshInterval: number;
    githubInterval: number;
    timeout?: number;

    gitHubClient?: GitHubClient;

    notifications: Notification[];
    retryAttempts: number;
    retryIntervals: Array<number>;
    hasLazilyInit: boolean;
    showAlertNotification: boolean;
    showParticipatingOnly: boolean;

    source?: MessageTray.SystemNotificationSource;
    settings?: Settings;

    readonly box: BoxLayout;
    readonly label: Label;
    readonly icon: Icon;

    constructor() {
        this.domain = 'github.com';
        this.token = '';
        this.handle = '';

        this.hideWidget = false;
        this.hideCount = false;

        this.refreshInterval = 60;
        this.githubInterval = 60;

        this.notifications = [];

        this.retryAttempts = 0;
        this.retryIntervals = [60, 120, 240, 480, 960, 1920, 3600];
        this.hasLazilyInit = false;
        this.showAlertNotification = true;
        this.showParticipatingOnly = false;

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

    interval(minAllowed: number) {
        let interval = this.refreshInterval;
        if (this.retryAttempts > 0) {
            interval = this.retryIntervals[this.retryAttempts] || 3600;
        }
        return Math.max(interval, minAllowed);
    }

    lazyInit() {
        if (!this.settings) {
            GitHubNotifications.LOGGER.warn('Unable to peform lazy init: extension settings are not initialized');
            return;
        }

        this.hasLazilyInit = true;
        this.reloadSettings();
        this.initHttp();
        this.settings.connect('changed', () => {
            this.reloadSettings();
            this.initHttp();
            this.stopLoop();
            this.planFetch(5, false);
        });

        this.initUI();
    }

    start() {
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.github.manager');
        if (!this.hasLazilyInit) {
            this.lazyInit();
        }
        this.fetchNotifications();
        Main.panel._rightBox.insert_child_at_index(this.box, 0);
    }

    stop() {
        this.stopLoop();
        Main.panel._rightBox.remove_child(this.box);
    }

    reloadSettings() {
        if (this.settings) {
            this.domain = this.settings.get_string('domain');
            this.token = this.settings.get_string('token');
            this.handle = this.settings.get_string('handle');
            this.hideWidget = this.settings.get_boolean('hide-widget');
            this.hideCount = this.settings.get_boolean('hide-notification-count');
            this.refreshInterval = this.settings.get_int('refresh-interval');
            this.showAlertNotification = this.settings.get_boolean('show-alert');
            this.showParticipatingOnly = this.settings.get_boolean('show-participating-only');
        } else {
            GitHubNotifications.LOGGER.error('Unable to reload settings: Extension settings object is not initialized');
        }

        this.checkVisibility();
    }

    checkVisibility() {
        if (this.box) {
            this.box.visible = !this.hideWidget || this.notifications.length != 0;
        }
        if (this.label) {
            this.label.visible = !this.hideCount;
        }
    }

    stopLoop() {
        if (this.timeout) {
            Mainloop.source_remove(this.timeout);
            this.timeout = undefined;
        }
    }

    initUI() {
        this.checkVisibility();

        this.icon.gicon = icon_new_for_string(`${Me.path}/github.svg`);

        this.box.add_actor(this.icon);
        this.box.add_actor(this.label);

        this.box.connect('button-press-event', (_, event) => {
            const button: number = event.get_button();

            if (button == 1) {
                this.showBrowserUri();
            } else if (button == 3) {
                ExtensionUtils.openPrefs();
            }
        });
    }

    showBrowserUri() {
        try {
            let url = `https://${this.domain}/notifications`;
            if (this.showParticipatingOnly) {
                url = `https://${this.domain}/notifications/participating`;
            }

            show_uri(null, url, CURRENT_TIME);
        } catch (e) {
            GitHubNotifications.LOGGER.error(`Cannot open uri ${e}`);
        }
    }

    initHttp() {
        this.gitHubClient = GitHubClientFactory.newClient(this.domain, this.token);
    }

    planFetch(delay: number, retry: boolean) {
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
    }

    fetchNotifications() {
        const client = this.gitHubClient;
        if (!client) {
            return;
        }

        let failed = false;
        client.listNotifications(this.showParticipatingOnly).then((notifications: Notification[]) => {
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

    updateNotifications(data: Notification[]) {
        const lastNotificationsCount = this.notifications.length;

        this.notifications = data;
        this.label.set_text(`${data.length}`);
        this.checkVisibility();
        this.alertWithNotifications(lastNotificationsCount);
    }

    alertWithNotifications(lastCount: number) {
        const newCount = this.notifications.length;

        if (newCount && newCount > lastCount && this.showAlertNotification) {
            try {
                const message = `You have ${newCount} new notifications`;

                this.notify('Github Notifications', message);
            } catch (e) {
                GitHubNotifications.LOGGER.error(`Cannot notify ${e}`);
            }
        }
    }

    notify(title: string, message: string) {
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
