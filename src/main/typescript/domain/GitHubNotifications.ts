import { BoxLayout, Label, Icon } from '@gi-types/st1';
import { ActorAlign, CURRENT_TIME } from '@gi-types/clutter10';
import { URI, Session, AuthManager, AuthBasic, Message } from '@gi-types/soup2';

import { icon_new_for_string, Settings } from '@gi-types/gio2';
import { show_uri } from '@gi-types/gtk4';

import { Logger } from '@github-manager/utils/Logger';

const Main: Main = imports.ui.main;
const Mainloop: MainLoop = imports.mainloop;
const MessageTray : MessageTray = imports.ui.messageTray;

const ExtensionUtils: ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

export class GitHubNotifications {
    static readonly LOGGER: Logger = new Logger('github-manager.domain.GitHubNotifications');

    domain: string;
    token: string;
    handle: string;
    hideWidget: boolean;
    hideCount: boolean;
    refreshInterval: number;
    githubInterval: number;
    timeout?: number;

    httpSession?: Session;
    authUri?: URI;
    authManager?: AuthManager;
    auth?: AuthBasic;

    notifications = [];
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

    interval() {
        let i = this.refreshInterval;
        if (this.retryAttempts > 0) {
            i = this.retryIntervals[this.retryAttempts] || 3600;
        }
        return Math.max(i, this.githubInterval);
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
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.github.notifications');
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
        let url = `https://api.${this.domain}/notifications`;
        if (this.showParticipatingOnly) {
            url = `https://api.${this.domain}/notifications?participating=1`;
        }
        this.authUri = URI.new(url);
        this.authUri.set_user(this.handle);
        this.authUri.set_password(this.token);

        if (this.httpSession) {
            this.httpSession.abort();
        } else {
            this.httpSession = new Session();
            this.httpSession.user_agent = 'gnome-shell-extension github notification via libsoup';

            this.authManager = new AuthManager();
            this.auth = new AuthBasic({ host: `api.${this.domain}`, realm: 'Github Api' });

            this.authManager.use_auth(this.authUri, this.auth);
            Session.prototype.add_feature.call(this.httpSession, this.authManager);
        }
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
        if (!this.httpSession) {
            return;
        }

        const message = new Message({ method: 'GET', uri: this.authUri });
        this.httpSession.queue_message(message, (_, response) => {
            try {
                if (response.status_code == 200 || response.status_code == 304) {
                    if (response.response_headers.get('X-Poll-Interval')) {
                        this.githubInterval = Number(response.response_headers.get('X-Poll-Interval'));
                    }
                    this.planFetch(this.interval(), false);
                    if (response.status_code == 200) {
                        const data = JSON.parse(response.response_body.data);
                        this.updateNotifications(data);
                    }
                    return;
                }
                if (response.status_code == 401) {
                    GitHubNotifications.LOGGER.error('Unauthorized. Check your github handle and token in the settings');
                    this.planFetch(this.interval(), true);
                    this.label.set_text('!');
                    return;
                }
                if (!response.response_body.data && response.status_code > 400) {
                    GitHubNotifications.LOGGER.error(`HTTP error:${response.status_code}`);
                    this.planFetch(this.interval(), true);
                    return;
                }
                // if we reach this point, none of the cases above have been triggered
                // which likely means there was an error locally or on the network
                // therefore we should try again in a while
                GitHubNotifications.LOGGER.error(`Response error. Status: ${response.status_code}, Response: ${JSON.stringify(response)}`);
                this.planFetch(this.interval(), true);
                this.label.set_text('!');
                return;
            } catch (e) {
                GitHubNotifications.LOGGER.error(`HTTP exception:${e}`);
                return;
            }
        });
    }

    updateNotifications(data: any) {
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
