import { GitHubNotifications } from '@github-manager/domain/GitHubNotifications';
import { Logger, LogLevel } from '@github-manager/utils/Logger';

// Set global logging level
Logger.GLOBAL_LOGGING_LEVEL = LogLevel.DEBUG;

/**
 * Main Extension class.
 */
class GitHubManagerExtension {
    private static readonly LOGGER: Logger = new Logger('github-manager.GitHubManagerExtension');

    private readonly gitHubNotifications: GitHubNotifications;

    public constructor() {
        this.gitHubNotifications = new GitHubNotifications();
    }

    public enable(): void {
        GitHubManagerExtension.LOGGER.debug('Enabling extension');
        this.gitHubNotifications.start();
    }

    public disable(): void {
        GitHubManagerExtension.LOGGER.debug('Disabling extension');
        this.gitHubNotifications.stop();
    }
}

export default function (): GitHubManagerExtension {
    return new GitHubManagerExtension();
}
