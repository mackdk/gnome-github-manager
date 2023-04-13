import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { GitHubManager } from '@github-manager/core';
import { LogLevel, Logger } from '@github-manager/utils';
import { initializeTranslations } from '@github-manager/utils/locale';

// Set global logging level
Logger.globalLoggingLevel = LogLevel.INFO;

/**
 * Extension entry point class.
 */
class GitHubManagerExtension {
    private static readonly LOGGER: Logger = new Logger('GitHubManagerExtension');

    private gitHubManager?: GitHubManager;

    public enable(): void {
        if (this.gitHubManager !== undefined) {
            GitHubManagerExtension.LOGGER.warn('Inconsistent state: enabled() call with extension already enabled.');
            return;
        }

        try {
            GitHubManagerExtension.LOGGER.debug('Inizializing extension at {0}', new Date().toISOString());
            this.gitHubManager = new GitHubManager();
            this.gitHubManager.start();
        } catch (err) {
            GitHubManagerExtension.LOGGER.error('Unexpected error while enabling extension', err);
            this.gitHubManager = undefined;
        }
    }

    public disable(): void {
        if (this.gitHubManager === undefined) {
            GitHubManagerExtension.LOGGER.warn('Inconsistent state: disable() called and extension was never enabled.');
            return;
        }

        try {
            GitHubManagerExtension.LOGGER.debug('Disabling extension at {0}.', new Date().toISOString());
            this.gitHubManager.stop();
            this.gitHubManager.dispose();
        } catch (err) {
            GitHubManagerExtension.LOGGER.error('Unexpected error while stopping extension', err);
        } finally {
            this.gitHubManager = undefined;
        }
    }
}

export default function (): GitHubManagerExtension {
    initializeTranslations(`${getCurrentExtension().metadata.uuid}`);

    return new GitHubManagerExtension();
}
