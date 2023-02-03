import { Settings } from '@gi-types/gio2';
import { GitHubNotifications } from '@github-manager/domain/GitHubNotifications';
import { Logger, LogLevel } from '@github-manager/utils/Logger';
import { getSettings } from '@gnome-shell/misc/extensionUtils';
import { Configuration } from './domain/Configuration';

// Set global logging level
Logger.globalLoggingLevel = LogLevel.DEBUG;

/**
 * Main Extension class.
 */
class GitHubManagerExtension {
    private static readonly LOGGER: Logger = new Logger('github-manager.GitHubManagerExtension');

    private gitHubNotifications?: GitHubNotifications;

    public enable(): void {
        GitHubManagerExtension.LOGGER.debug('Reading settings from schema');
        const settings : Settings = getSettings();

        GitHubManagerExtension.LOGGER.debug('Creating main extension logic');
        this.gitHubNotifications = new GitHubNotifications(Configuration.wrap(settings));

        GitHubManagerExtension.LOGGER.debug('Starting extension');
        this.gitHubNotifications.start();
    }

    public disable(): void {
        GitHubManagerExtension.LOGGER.debug('Stopping extension');
        this.gitHubNotifications?.stop();
    }
}

export default function (): GitHubManagerExtension {
    return new GitHubManagerExtension();
}
