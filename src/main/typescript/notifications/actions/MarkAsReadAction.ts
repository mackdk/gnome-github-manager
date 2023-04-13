import { GitHub, GitHubClient } from '@github-manager/client';
import { EventDispatcher } from '@github-manager/utils';
import { _ } from '@github-manager/utils/locale';

import { NotificationAction } from './NotificationAction';

export class MarkAsReadAction implements NotificationAction {
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
        if (notification) {
            this.gitHubClient.markThreadAsRead(notification);
            void this.eventDispatcher.emit('notificationRead', notification.id);
        } else {
            // No specific notification selected, action on a digest notification
            this.gitHubClient.markAllThreadsAsRead();
            void this.eventDispatcher.emit('allNotificationsRead');
        }
    }
}
