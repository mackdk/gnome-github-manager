import { GitHubNotifications } from '@github-manager/domain/GitHubNotifications';
import { Logger } from '@github-manager/utils/Logger';

/**
 * Main Extension class.
 */
class GitHubNotificationsExtension {
    static readonly LOGGER: Logger = new Logger('github-manager.GitHubNotificationsExtension');

    readonly gitHubNotifications: GitHubNotifications;

    constructor() {
        this.gitHubNotifications = new GitHubNotifications();
    }

    enable(): void {
        GitHubNotificationsExtension.LOGGER.debug('Enabling extension');
        this.gitHubNotifications.start();
    }

    disable(): void {
        GitHubNotificationsExtension.LOGGER.debug('Disabling extension');
        this.gitHubNotifications.stop();
    }
}

export default function (): GitHubNotificationsExtension {
    return new GitHubNotificationsExtension();
}
