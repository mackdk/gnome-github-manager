import { Icon } from '@gi-types/gio2';
import { main as ShellUI } from '@gnome-shell/ui';
import { Notification } from '@gnome-shell/ui/messageTray';
import { Status } from '@tshttp/status';

import { ApiError, GitHub, GitHubClient, GitHubClientFactory } from '@github-manager/client';
import { Configuration, NotificationActionType } from '@github-manager/common';
import { EventDispatcher, LimitedRetriableTimer, Logger } from '@github-manager/utils';

import { NotificationAction, NotificationAdapter } from './NotificationAdapter';
import { DismissAction, MarkAsReadAction, OpenAction } from './actions/';

export class NotificationController {
    private static readonly LOGGER: Logger = new Logger('notifications::NotificationController');

    private readonly eventDispatcher: EventDispatcher;

    private readonly configuration: Configuration;

    private readonly gitHubClient: GitHubClient;

    private readonly timer: LimitedRetriableTimer;

    private readonly notificationAdapter: NotificationAdapter;

    private notifications: GitHub.Thread[];

    public constructor(configuration: Configuration, eventDispatcher: EventDispatcher, gitHubIcon: Icon) {
        this.configuration = configuration;
        this.eventDispatcher = eventDispatcher;

        this.timer = new LimitedRetriableTimer(this.fetchNotifications.bind(this), this.configuration.refreshInterval);
        this.gitHubClient = GitHubClientFactory.newClient(this.configuration.domain, this.configuration.token);
        this.notifications = [];

        this.notificationAdapter = new NotificationAdapter(
            this.configuration.notificationMode,
            gitHubIcon,
            this.getUserDefinedAction(this.configuration.notificationActivateAction),
            this.getUserDefinedAction(this.configuration.notificationPrimaryAction),
            this.getUserDefinedAction(this.configuration.notificationSecondaryAction)
        );

        // Listen to configuration changes
        this.eventDispatcher.addEventListener(
            'configurationPropertyChanged',
            this.configurationPropertyChanged.bind(this)
        );

        this.eventDispatcher.addEventListener('notificationRead', this.markAsRead.bind(this));
        this.eventDispatcher.addEventListener('allNotificationsRead', this.markAllAsRead.bind(this));
    }

    public startPolling(): void {
        this.timer.start();
    }

    public stopPolling(): void {
        this.timer.stop();
    }

    private configurationPropertyChanged(property: string): void {
        NotificationController.LOGGER.debug('Configuration property {0} is changed', property);

        if (property == 'domain') {
            this.gitHubClient.domain = this.configuration.domain;
        }

        if (property == 'token') {
            this.gitHubClient.token = this.configuration.token;
        }

        if (property == 'refreshInterval' || property == 'showParticipatingOnly') {
            this.timer.interval = this.configuration.refreshInterval;
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

    private async fetchNotifications(): Promise<boolean> {
        NotificationController.LOGGER.debug('Feching GitHub notifications');

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
                NotificationController.LOGGER.error(
                    'HTTP error {0}: {1}',
                    error.statusCode,
                    error.message,
                    error.cause
                );
            } else {
                NotificationController.LOGGER.error('Unexpected error while retrieving notifications', error);
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
            if (item.id == notificationId) {
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
