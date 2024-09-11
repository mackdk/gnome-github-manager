import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { Logger } from '@github-manager/utils';

import { GitHubClient } from './GitHubClient';
import { GitHubClientImpl } from './GitHubClientImpl';
import { Soup3HttpEngine } from './Soup3HttpEngine';

const LOGGER: Logger = new Logger('client::GitHubClientFactory');

export function newClient(domain: string, token: string): GitHubClient {
    const extensionName = getCurrentExtension().metadata.name;
    const soupVersion: string = imports.gi.versions.Soup;
    if (soupVersion === '3.0') {
        LOGGER.info('Using Soup3HttpEngine for GitHubClient. Soup version: {0}', soupVersion);
        return new GitHubClientImpl(domain, token, new Soup3HttpEngine(`${extensionName} via Soup 3.0`));
    } else {
        throw new Error(`Unsupported Soup version: ${soupVersion}`);
    }
}
