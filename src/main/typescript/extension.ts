import { Configuration, GitHubNotifications } from '@github-manager/core';
import { LogLevel, Logger } from '@github-manager/utils';

// Set global logging level
Logger.globalLoggingLevel = LogLevel.DEBUG;

/**
 * Main Extension class.
 */
class GitHubManagerExtension {
    private static readonly LOGGER: Logger = new Logger('GitHubManagerExtension');

    private gitHubNotifications?: GitHubNotifications;

    public enable(): void {
        try {
            GitHubManagerExtension.LOGGER.debug('Reading settings from schema');

            GitHubManagerExtension.LOGGER.debug('Creating main extension logic');
            this.gitHubNotifications = new GitHubNotifications(Configuration.getInstance());

            GitHubManagerExtension.LOGGER.debug('Starting extension');
            this.gitHubNotifications.start();
        } catch (err) {
            GitHubManagerExtension.LOGGER.error('Unexpected error while enabling extension', err);
        }
    }

    public disable(): void {
        try {
            GitHubManagerExtension.LOGGER.debug('Stopping extension');
            this.gitHubNotifications?.stop();
        } catch (err) {
            GitHubManagerExtension.LOGGER.error('Unexpected error while stopping extension', err);
        }
    }
}

export default function (): GitHubManagerExtension {
    return new GitHubManagerExtension();
}
