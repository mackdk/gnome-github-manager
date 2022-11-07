import { GitHubNotifications } from '@github-manager/domain/GitHubNotifications';
import { Logger } from '@github-manager/utils/Logger';

/**
 * Main Extension class.
 */
class GitHubManagerExtension {
    static readonly LOGGER: Logger = new Logger('github-manager.GitHubManagerExtension');

    readonly gitHubNotifications: GitHubNotifications;

    constructor() {
        this.gitHubNotifications = new GitHubNotifications();
    }

    enable(): void {
        GitHubManagerExtension.LOGGER.debug('Enabling extension');
        this.gitHubNotifications.start();
    }

    disable(): void {
        GitHubManagerExtension.LOGGER.debug('Disabling extension');
        this.gitHubNotifications.stop();
    }
}

export default function (): GitHubManagerExtension {
    return new GitHubManagerExtension();
}
