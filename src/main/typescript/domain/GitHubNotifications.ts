import { BoxLayout, Label, Icon } from '@gi-types/st1';
import { ActorAlign, CURRENT_TIME } from '@gi-types/clutter10';
import { ButtonEvent, BUTTON_PRIMARY, BUTTON_SECONDARY } from '@gi-types/gdk4';

import { icon_new_for_string } from '@gi-types/gio2';
import { show_uri } from '@gi-types/gtk4';

import { Status } from '@tshttp/status';

import { ApiError, GitHubClient, GitHubClientFactory, Notification } from '@github-manager/domain/GitHubClient';
import { Logger } from '@github-manager/utils/Logger';
import { Configuration } from './Configuration';
import { LimitedRetriableTimer } from '@github-manager/utils/LimitedRetriableTimer';

const Main: Main = imports.ui.main;
const MessageTray : MessageTray = imports.ui.messageTray;

const Me = imports.misc.extensionUtils.getCurrentExtension();

export class GitHubNotifications {
    private static readonly LOGGER: Logger = new Logger('github-manager.domain.GitHubNotifications');

    private gitHubClient: GitHubClient;
    private timer: LimitedRetriableTimer;

    private notifications: Notification[];

    private source?: MessageTray.SystemNotificationSource;
    private readonly configuration: Configuration;

    private readonly box: BoxLayout;
    private readonly label: Label;
    private readonly icon: Icon;

    public constructor(configuration: Configuration) {
        this.configuration = configuration;
        this.configuration.addChangeListener(this.configurationPropertyChanged.bind(this));

        this.timer = new LimitedRetriableTimer(this.fetchNotifications.bind(this), this.configuration.refreshInterval);
        this.gitHubClient = GitHubClientFactory.newClient(this.configuration.domain, this.configuration.token);
        this.notifications = [];

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

        this.icon.gicon = icon_new_for_string(`${Me.path}/github.svg`);

        this.box.add_actor(this.icon);
        this.box.add_actor(this.label);

        this.box.connect('button-press-event', (_, event) => this.handleButtonPress(event));

        this.updateButtonVisibility();
    }

    private configurationPropertyChanged(property: string) {
        GitHubNotifications.LOGGER.debug(`Configuration property '${property}' is changed`);

        if (property == 'domain' || property == 'token') {
            this.gitHubClient = GitHubClientFactory.newClient(this.configuration.domain, this.configuration.token);
        }

        if (property == 'refreshInterval' || property == 'showParticipatingOnly') {
            this.timer.stop();
            this.timer = new LimitedRetriableTimer(this.fetchNotifications.bind(this), this.configuration.refreshInterval);
            this.timer.start();
        }

        if (property == 'hideWidget' || property == 'hideNotificationCount') {
            this.updateButtonVisibility();
        }
    }

    public start() {
        this.timer.start();

        // Add the widget to the UI
        Main.panel._rightBox.insert_child_at_index(this.box, 0);
    }

    public stop() {
        this.timer.stop();

        // Remove the widget to the UI
        Main.panel._rightBox.remove_child(this.box);
    }

    private updateButtonVisibility() {
        this.box.visible = !this.configuration.hideWidget || this.notifications.length != 0;
        this.label.visible = !this.configuration.hideNotificationCount;
    }

    private handleButtonPress(event: ButtonEvent) {
        switch (event.get_button()) {
            case BUTTON_PRIMARY:
                this.showBrowserUri();
                break;
            case BUTTON_SECONDARY:
                imports.misc.extensionUtils.openPrefs();
                break;
        }
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

    private async fetchNotifications() : Promise<boolean> {
        GitHubNotifications.LOGGER.debug('Feching GitHub notifications');

        try {
            const notifications = await this.gitHubClient.listNotifications(this.configuration.showParticipatingOnly);
            this.updateNotifications(notifications);
            return true;
        } catch(error) {
            if (error instanceof ApiError) {
                // If we get not modified as response just proceed
                if (error.statusCode == Status.NotModified) {
                    return true;
                }

                // Mark the error and prepare for retry
                GitHubNotifications.LOGGER.error(`HTTP error ${error.statusCode}: ${error.message}`, error.error);
            } else {
                GitHubNotifications.LOGGER.error('Unexpected error while retrieving notifications', error);
            }

            this.label.set_text('!');
            return false;
        } finally {
            this.timer.lowerIntervalLimit = this.gitHubClient.pollInterval;
        }
    }

    private updateNotifications(data: Notification[]) {
        const lastNotificationsCount = this.notifications.length;

        this.notifications = data;
        this.label.set_text(`${data.length}`);
        this.updateButtonVisibility();
        this.alertWithNotifications(lastNotificationsCount);
    }

    private alertWithNotifications(lastCount: number) {
        const newCount = this.notifications.length;

        if (newCount && newCount > lastCount && this.configuration.showAlert) {
            try {
                const message = `You have ${newCount} new notifications`;

                this.notify('Github Notifications', message);
            } catch (e) {
                GitHubNotifications.LOGGER.error('Cannot notify', e);
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
