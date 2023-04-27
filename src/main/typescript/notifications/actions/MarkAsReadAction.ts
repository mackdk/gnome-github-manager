import { ApiError, GitHub, GitHubClient } from '@github-manager/client';
import { EventDispatcher, Logger } from '@github-manager/utils';
import { _ } from '@github-manager/utils/locale';

import { NotificationAction } from './NotificationAction';

export class MarkAsReadAction implements NotificationAction {
    private static readonly LOGGER: Logger = new Logger('notifications::actions::MarkAsReadAction');

    private readonly gitHubClient: GitHubClient;

    private readonly eventDispatcher: EventDispatcher;

    public constructor(gitHubClient: GitHubClient, eventDispatcher: EventDispatcher) {
        this.gitHubClient = gitHubClient;
        this.eventDispatcher = eventDispatcher;
    }

    public get label(): string {
        return _('Mark as read');
    }

    public execute(notification?: GitHub.Thread): void {
        if (notification !== undefined) {
            this.readSingle(notification);
            return;
        }

        // No specific notification selected, action on a digest notification
        this.readAll();
    }

    private readSingle(notification: GitHub.Thread): void {
        this.gitHubClient
            .markThreadAsRead(notification)
            .then(() => {
                return this.eventDispatcher.emit('notificationRead', notification.id);
            })
            .catch((error) => {
                if (error instanceof ApiError) {
                    MarkAsReadAction.LOGGER.error(
                        'Cannot mark notification as read {0}: HTTP error {1}: {2}',
                        notification.id,
                        error.statusCode,
                        error.message,
                        error.cause
                    );
                } else {
                    MarkAsReadAction.LOGGER.error('Cannot mark notification as read {0}', notification.id, error);
                }
            });
    }

    private readAll(): void {
        this.gitHubClient
            .markAllThreadsAsRead()
            .then(() => {
                return this.eventDispatcher.emit('allNotificationsRead');
            })
            .catch((error) => {
                if (error instanceof ApiError) {
                    MarkAsReadAction.LOGGER.error(
                        'Cannot mark all notifications as read {0}: HTTP error {1}: {2}',
                        error.statusCode,
                        error.message,
                        error.cause
                    );
                } else {
                    MarkAsReadAction.LOGGER.error('Cannot mark all notifications as read', error);
                }
            });
    }
}
