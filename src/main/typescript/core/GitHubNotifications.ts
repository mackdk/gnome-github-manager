import { CURRENT_TIME } from '@gi-types/clutter10';
import { ButtonEvent, BUTTON_PRIMARY, BUTTON_SECONDARY } from '@gi-types/gdk4';
import { icon_new_for_string } from '@gi-types/gio2';
import { show_uri } from '@gi-types/gtk4';
import { getCurrentExtension, openPrefs } from '@gnome-shell/misc/extensionUtils';
import { main as ShellUI } from '@gnome-shell/ui';
import { Status } from '@tshttp/status';

import { Configuration } from './Configuration';
import { ApiError, GitHubClient, GitHubClientFactory, Notification } from '@github-manager/client';
import { GitHubWidget, NotificationManager } from '@github-manager/ui';
import { Logger, LimitedRetriableTimer } from '@github-manager/utils';

export class GitHubNotifications {
    private static readonly LOGGER: Logger = new Logger('core::GitHubNotifications');

    private gitHubClient: GitHubClient;
    private timer: LimitedRetriableTimer;

    private notifications: Notification[];
    private readonly notificationManager: NotificationManager;

    private readonly configuration: Configuration;
    private readonly widget: GitHubWidget;

    public constructor(configuration: Configuration) {
        this.configuration = configuration;
        this.configuration.addChangeListener(this.configurationPropertyChanged.bind(this));

        this.timer = new LimitedRetriableTimer(this.fetchNotifications.bind(this), this.configuration.refreshInterval);
        this.gitHubClient = GitHubClientFactory.newClient(this.configuration.domain, this.configuration.token);
        this.notifications = [];

        const githubIcon = icon_new_for_string(`${getCurrentExtension().path}/github.svg`);

        this.notificationManager = new NotificationManager(githubIcon);

        this.widget = new GitHubWidget(githubIcon, `${this.notifications.length}`);
        this.widget.connect('button-press-event', (_, event) => this.handleButtonPress(event));

        this.updateButtonVisibility();
    }

    private configurationPropertyChanged(property: string) {
        GitHubNotifications.LOGGER.debug('Configuration property {0} is changed', property);

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
        ShellUI.panel._rightBox.insert_child_at_index(this.widget, 0);
    }

    public stop() {
        this.timer.stop();

        // Remove the widget to the UI
        ShellUI.panel._rightBox.remove_child(this.widget);
    }

    private updateButtonVisibility() {
        this.widget.textVisible = !this.configuration.hideNotificationCount;
    }

    private handleButtonPress(event: ButtonEvent) {
        switch (event.get_button()) {
            case BUTTON_PRIMARY:
                this.showBrowserUri();
                break;
            case BUTTON_SECONDARY:
                openPrefs();
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
            GitHubNotifications.LOGGER.error('Cannot open uri', e);
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
                GitHubNotifications.LOGGER.error('HTTP error {0}: {1}', error.statusCode, error.message, error.error);
            } else {
                GitHubNotifications.LOGGER.error('Unexpected error while retrieving notifications', error);
            }

            this.widget.text = '!';
            return false;
        } finally {
            this.timer.lowerIntervalLimit = this.gitHubClient.pollInterval;
        }
    }

    private updateNotifications(data: Notification[]) {
        const lastNotificationsCount = this.notifications.length;

        this.notifications = data;
        this.widget.text = `${data.length}`;
        this.updateButtonVisibility();
        this.alertWithNotifications(lastNotificationsCount);
    }

    private alertWithNotifications(lastCount: number) {
        const newCount = this.notifications.length;

        if (newCount && newCount > lastCount && this.configuration.showAlert) {
            GitHubNotifications.LOGGER.debug('Sending notification');

            try {
                this.notificationManager.notify('Github Notifications', `You have ${newCount} new notifications`);
            } catch (e) {
                GitHubNotifications.LOGGER.error('Cannot notify', e);
            }
        }
    }

}
