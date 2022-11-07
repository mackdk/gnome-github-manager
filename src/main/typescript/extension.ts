import { GitHubNotifications } from '@github-manager/domain/GitHubNotifications';

/**
 * Main Extension class.
 */
class GitHubNotificationsExtension {
    readonly gitHubNotifications: GitHubNotifications;

    constructor() {
        this.gitHubNotifications = new GitHubNotifications();
    }

    enable(): void {
        this.gitHubNotifications.start();
    }

    disable(): void {
        this.gitHubNotifications.stop();
    }
}

export default function (): GitHubNotificationsExtension {
    return new GitHubNotificationsExtension();
}
