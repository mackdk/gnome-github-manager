import { CURRENT_TIME } from '@gi-types/clutter10';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, ButtonEvent } from '@gi-types/gdk4';
import { icon_new_for_string } from '@gi-types/gio2';
import { show_uri } from '@gi-types/gtk4';
import { getCurrentExtension, openPrefs } from '@gnome-shell/misc/extensionUtils';
import { main as ShellUI } from '@gnome-shell/ui';
import { Notification as UINotification } from '@gnome-shell/ui/messageTray';
import { Status } from '@tshttp/status';

import { ApiError, GitHub, GitHubClient, GitHubClientFactory } from '@github-manager/client';
import { Configuration, NotificationActionType } from '@github-manager/common';
import { NotificationAction, NotificationAdapter, NotificationCallback } from '@github-manager/notifications';
import { LimitedRetriableTimer, Logger } from '@github-manager/utils';
import { _ } from '@github-manager/utils/locale';
import { GitHubWidget } from '@github-manager/widget';

class InternalNotificationAction {
    private readonly _label: string;
    private readonly _callback: NotificationCallback;

    public constructor(label: string, callback: NotificationCallback) {
        this._label = label;
        this._callback = callback;
    }

    public get label(): string {
        return this._label;
    }

    public get callback(): NotificationCallback {
        return this._callback;
    }
}

export class GitHubNotifications {
    private static readonly LOGGER: Logger = new Logger('core::GitHubNotifications');

    private gitHubClient: GitHubClient;
    private timer: LimitedRetriableTimer;

    private notifications: GitHub.Thread[];

    private readonly notificationAdapter: NotificationAdapter;

    private readonly configuration: Configuration;
    private readonly widget: GitHubWidget;

    private readonly openAction: NotificationAction;
    private readonly markAsReadAction: NotificationAction;
    private readonly dismissAction: NotificationAction;

    public constructor(configuration: Configuration) {
        this.configuration = configuration;
        this.configuration.addChangeListener(this.configurationPropertyChanged.bind(this));

        this.timer = new LimitedRetriableTimer(this.fetchNotifications.bind(this), this.configuration.refreshInterval);
        this.gitHubClient = GitHubClientFactory.newClient(this.configuration.domain, this.configuration.token);
        this.notifications = [];

        const githubIcon = icon_new_for_string(`${getCurrentExtension().path}/github.svg`);

        this.openAction = new InternalNotificationAction(_('Open'), this.onNotificationOpen.bind(this));
        this.markAsReadAction = new InternalNotificationAction(
            _('Mark as Read'),
            this.onNotificationMarkRead.bind(this)
        );
        this.dismissAction = new InternalNotificationAction(_('Dismiss'), () => {
            // Nothing to do
        });

        this.notificationAdapter = new NotificationAdapter(
            this.configuration.notificationMode,
            githubIcon,
            this.getUserDefinedAction(this.configuration.notificationActivateAction),
            this.getUserDefinedAction(this.configuration.notificationPrimaryAction),
            this.getUserDefinedAction(this.configuration.notificationSecondaryAction)
        );

        this.widget = new GitHubWidget(githubIcon, `${this.notifications.length}`);
        this.widget.connect('button-press-event', (_: this, event: ButtonEvent) => this.handleButtonPress(event));

        this.updateButtonVisibility();
    }

    private configurationPropertyChanged(property: string): void {
        GitHubNotifications.LOGGER.debug('Configuration property {0} is changed', property);

        if (property == 'domain' || property == 'token') {
            this.gitHubClient = GitHubClientFactory.newClient(this.configuration.domain, this.configuration.token);
        }

        if (property == 'refreshInterval' || property == 'showParticipatingOnly') {
            this.timer.stop();
            this.timer = new LimitedRetriableTimer(
                this.fetchNotifications.bind(this),
                this.configuration.refreshInterval
            );
            this.timer.start();
        }

        if (property == 'hideWidget' || property == 'hideNotificationCount') {
            this.updateButtonVisibility();
        }

        if (property == 'notificationMode') {
            this.notificationAdapter.notificationMode = this.configuration.notificationMode;
        }

        if (property == 'notificationActivateAction') {
            this.notificationAdapter.activateAction = this.getUserDefinedAction(
                this.configuration.notificationActivateAction
            );
        }

        if (property == 'notificationPrimaryAction') {
            this.notificationAdapter.primaryAction = this.getUserDefinedAction(
                this.configuration.notificationPrimaryAction
            );
        }

        if (property == 'notificationSecondaryAction') {
            this.notificationAdapter.secondaryAction = this.getUserDefinedAction(
                this.configuration.notificationSecondaryAction
            );
        }
    }

    public start(): void {
        this.timer.start();

        // Add the widget to the UI
        ShellUI.panel._rightBox.insert_child_at_index(this.widget, 0);
    }

    public stop(): void {
        this.timer.stop();

        // Remove the widget to the UI
        ShellUI.panel._rightBox.remove_child(this.widget);
    }

    private updateButtonVisibility(): void {
        this.widget.textVisible = !this.configuration.hideNotificationCount;
    }

    private handleButtonPress(event: ButtonEvent): void {
        switch (event.get_button()) {
            case BUTTON_PRIMARY:
                this.showBrowserUri();
                break;
            case BUTTON_SECONDARY:
                openPrefs();
                break;
        }
    }

    private showBrowserUri(): void {
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

    private async fetchNotifications(): Promise<boolean> {
        GitHubNotifications.LOGGER.debug('Feching GitHub notifications');

        try {
            const notifications = await this.gitHubClient.listThreads(this.configuration.showParticipatingOnly);
            this.updateNotifications(notifications);
            return true;
        } catch (error) {
            if (error instanceof ApiError) {
                // If we get not modified as response just proceed
                if (error.statusCode == Status.NotModified) {
                    return true;
                }

                // Mark the error and prepare for retry
                GitHubNotifications.LOGGER.error('HTTP error {0}: {1}', error.statusCode, error.message, error.cause);
            } else {
                GitHubNotifications.LOGGER.error('Unexpected error while retrieving notifications', error);
            }

            this.widget.text = '!';
            return false;
        } finally {
            this.timer.lowerIntervalLimit = this.gitHubClient.pollInterval;
        }
    }

    private updateNotifications(data: GitHub.Thread[]): void {
        const uiNotifications = this.notificationAdapter.adaptNotifications(this.notifications, data);

        this.notifications = data;
        this.widget.text = `${data.length}`;

        this.notify(uiNotifications);
    }

    private notify(notifications: UINotification | UINotification[]): void {
        const items: UINotification[] = notifications instanceof UINotification ? [notifications] : notifications;

        items.forEach((notification) => {
            const source = notification.source;

            ShellUI.messageTray.add(source);
            source.showNotification(notification);
        });
    }

    private onNotificationOpen(githubNotification?: GitHub.Thread): void {
        if (githubNotification) {
            this.gitHubClient
                .getWebUrlForSubject(githubNotification.subject)
                .then((url) => show_uri(null, url, CURRENT_TIME))
                .catch((error) => {
                    if (error instanceof ApiError) {
                        // Mark the error and prepare for retry
                        GitHubNotifications.LOGGER.error(
                            'HTTP error {0}: {1}',
                            error.statusCode,
                            error.message,
                            error.cause
                        );
                    } else {
                        GitHubNotifications.LOGGER.error('Unexpected error while retrieving notifications', error);
                    }

                    // Fallback opening the notifications page
                    show_uri(null, `https://${this.configuration.domain}/notifications`, CURRENT_TIME);
                });
        } else {
            // No specific notification selected, action on a digest notification
            show_uri(null, `https://${this.configuration.domain}/notifications`, CURRENT_TIME);
        }
    }

    private onNotificationMarkRead(githubNotification?: GitHub.Thread): void {
        if (githubNotification) {
            this.gitHubClient.markThreadAsRead(githubNotification);
            this.notifications.forEach((item, index) => {
                if (item.id == githubNotification.id) {
                    this.notifications.splice(index, 1);
                }
            });
            this.widget.text = `${this.notifications.length}`;
        } else {
            // No specific notification selected, action on a digest notification
            this.gitHubClient.markAllThreadsAsRead();
            this.notifications = [];
            this.widget.text = '0';
        }
    }

    private getUserDefinedAction(setting: NotificationActionType): NotificationAction | undefined {
        switch (setting) {
            case NotificationActionType.NONE:
                return undefined;

            case NotificationActionType.OPEN:
                return this.openAction;

            case NotificationActionType.MARK_READ:
                return this.markAsReadAction;

            case NotificationActionType.DISMISS:
                return this.dismissAction;
        }
    }
}
