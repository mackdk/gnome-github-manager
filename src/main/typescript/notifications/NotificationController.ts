import { Icon } from '@gi-types/gio2';
import { main as ShellUI } from '@gnome-shell/ui';
import { Notification } from '@gnome-shell/ui/messageTray';

import { ApiError, GitHub, GitHubClient, GitHubClientFactory, HttpStatus } from '@github-manager/client';
import { NotificationActionType, SettingsWrapper } from '@github-manager/settings';
import { EventDispatcher, LimitedRetriableTimer, Logger, lazy } from '@github-manager/utils';

import { NotificationAdapter } from './NotificationAdapter';
import { DismissAction, MarkAsReadAction, NotificationAction, OpenAction } from './actions/';

export class NotificationController {
    @lazy
    private static readonly LOGGER: Logger = new Logger('notifications::NotificationController');

    private readonly eventDispatcher: EventDispatcher;

    private readonly settings: SettingsWrapper;

    private readonly gitHubClient: GitHubClient;

    private readonly timer: LimitedRetriableTimer;

    private readonly notificationAdapter: NotificationAdapter;

    private notifications: GitHub.Thread[];

    public constructor(settings: SettingsWrapper, eventDispatcher: EventDispatcher, gitHubIcon: Icon) {
        this.settings = settings;
        this.eventDispatcher = eventDispatcher;

        this.timer = new LimitedRetriableTimer(this.fetchNotifications.bind(this), this.settings.refreshInterval);
        this.gitHubClient = GitHubClientFactory.newClient(this.settings.domain, this.settings.token);
        this.notifications = [];

        this.notificationAdapter = new NotificationAdapter(
            this.settings.notificationMode,
            gitHubIcon,
            this.getUserDefinedAction(this.settings.notificationActivateAction),
            this.getUserDefinedAction(this.settings.notificationPrimaryAction),
            this.getUserDefinedAction(this.settings.notificationSecondaryAction)
        );

        this.eventDispatcher.addEventListener('settingChanged', this.settingChanged.bind(this));
        this.eventDispatcher.addEventListener('notificationRead', this.markAsRead.bind(this));
        this.eventDispatcher.addEventListener('allNotificationsRead', this.markAllAsRead.bind(this));
    }

    public startPolling(): void {
        this.timer.start();
    }

    public stopPolling(): void {
        this.timer.stop();
    }

    private settingChanged(setting: string): void {
        switch (setting) {
            case 'domain':
                this.gitHubClient.domain = this.settings.domain;
                break;
            case 'token':
                this.gitHubClient.token = this.settings.token;
                break;
            case 'refresh-interval':
                this.timer.interval = this.settings.refreshInterval;
                break;
            case 'notification-mode':
                this.notificationAdapter.notificationMode = this.settings.notificationMode;
                break;
            case 'notification-activate-action':
                this.notificationAdapter.activateAction = this.getUserDefinedAction(
                    this.settings.notificationActivateAction
                );
                break;
            case 'notification-primary-action':
                this.notificationAdapter.primaryAction = this.getUserDefinedAction(
                    this.settings.notificationPrimaryAction
                );
                break;
            case 'notification-secondary-action':
                this.notificationAdapter.secondaryAction = this.getUserDefinedAction(
                    this.settings.notificationSecondaryAction
                );
                break;

            default:
                // Other settings are not of any interest for this controller
                return;
        }

        NotificationController.LOGGER.debug("Setting '{0}' is changed", setting);
    }

    private async fetchNotifications(): Promise<boolean> {
        NotificationController.LOGGER.debug('Feching GitHub notifications');

        try {
            const notifications = await this.gitHubClient.listThreads(this.settings.showParticipatingOnly);
            this.updateNotifications(notifications);
            return true;
        } catch (error) {
            if (error instanceof ApiError) {
                // If we get not modified as response just proceed
                if (error.statusCode === HttpStatus.NotModified) {
                    return true;
                }

                // Mark the error and prepare for retry
                NotificationController.LOGGER.error(
                    'Cannot retrieve notifications: HTTP error {0}: {1}',
                    error.statusCode,
                    error.message,
                    error.cause
                );
            } else {
                NotificationController.LOGGER.error('Cannot retrieve notifications', error);
            }

            void this.eventDispatcher.emit('updateNotificationCount', undefined);
            return false;
        } finally {
            this.timer.lowerIntervalLimit = this.gitHubClient.pollInterval;
        }
    }

    private updateNotifications(data: GitHub.Thread[]): void {
        const uiNotifications = this.notificationAdapter.adaptNotifications(this.notifications, data);

        this.notifications = data;
        void this.eventDispatcher.emit('updateNotificationCount', data.length);

        this.notify(uiNotifications);
    }

    private notify(notifications: Notification | Notification[]): void {
        const items: Notification[] = notifications instanceof Notification ? [notifications] : notifications;

        items.forEach((notification) => {
            const source = notification.source;

            ShellUI.messageTray.add(source);
            source.showNotification(notification);
        });
    }

    private markAsRead(notificationId: string): void {
        this.notifications.forEach((item, index) => {
            if (item.id === notificationId) {
                this.notifications.splice(index, 1);
            }
        });

        void this.eventDispatcher.emit('updateNotificationCount', this.notifications.length);
    }

    private markAllAsRead(): void {
        this.notifications = [];
        void this.eventDispatcher.emit('updateNotificationCount', '0');
    }

    private getUserDefinedAction(setting: NotificationActionType): NotificationAction | undefined {
        switch (setting) {
            case NotificationActionType.NONE:
                return undefined;

            case NotificationActionType.OPEN:
                return new OpenAction(this.gitHubClient, this.eventDispatcher);

            case NotificationActionType.MARK_READ:
                return new MarkAsReadAction(this.gitHubClient, this.eventDispatcher);

            case NotificationActionType.DISMISS:
                return new DismissAction();
        }
    }
}
