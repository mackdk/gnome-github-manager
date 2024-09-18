import { Extension, ExtensionMetadata } from '@girs/gnome-shell/dist/extensions/extension';

import { GitHubManager } from '@github-manager/core';
import { Logger, lazy } from '@github-manager/utils';

/**
 * Extension entry point class.
 */
export default class GitHubManagerExtension extends Extension {
    @lazy
    private static readonly LOGGER: Logger = new Logger('GitHubManagerExtension');

    private gitHubManager?: GitHubManager;

    public constructor(metadata: ExtensionMetadata) {
        super(metadata);

        Logger.initialize(metadata.name);
    }

    public enable(): void {
        if (this.gitHubManager !== undefined) {
            GitHubManagerExtension.LOGGER.warn('Inconsistent state: enabled() call with extension already enabled.');
            return;
        }

        try {
            GitHubManagerExtension.LOGGER.debug('Inizializing extension at {0}', new Date().toISOString());
            this.gitHubManager = new GitHubManager(this.metadata.name, this.path, this.getSettings());
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
