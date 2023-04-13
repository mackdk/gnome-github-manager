import { GitHub } from '@github-manager/client';

export interface NotificationAction {
    get label(): string;

    execute(notification?: GitHub.Thread): void;
}
