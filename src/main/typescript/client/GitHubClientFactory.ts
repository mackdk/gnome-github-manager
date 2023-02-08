import { Logger } from '@github-manager/utils';

import { GitHubClient } from './GitHubClient';
import { Soup2GitHubClient } from './Soup2GitHubClient';
import { Soup3GitHubClient } from './Soup3GitHubClient';

export class GitHubClientFactory {

    private static readonly LOGGER: Logger = new Logger('client::GitHubClientFactory');

    public static newClient(domain: string, token: string) : GitHubClient {
        const soupVersion = imports.gi.versions.Soup;
        if (soupVersion == '3.0') {
            GitHubClientFactory.LOGGER.info('Using Soup3GitHubClient client. Soup version: {0}', soupVersion);
            return new Soup3GitHubClient(domain, token);
        } else if (soupVersion == '2.4') {
            GitHubClientFactory.LOGGER.info('Using Soup2GitHubClient client. Soup version: {0}', soupVersion);
            return new Soup2GitHubClient(domain, token);
        } else {
            throw new Error(`Unsupported Soup version: ${soupVersion}`);
        }
    }
}
