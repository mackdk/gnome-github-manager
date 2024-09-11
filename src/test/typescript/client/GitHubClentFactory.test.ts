import { assert } from 'chai';

import * as GitHubClientFactory from '@github-manager/client/GitHubClientFactory';
import { GitHubClientImpl } from '@github-manager/client/GitHubClientImpl';
import { Soup3HttpEngine } from '@github-manager/client/Soup3HttpEngine';

import '@test-suite/globals';

describe('GitHubClientFactory', () => {
    it('can create client for Soup 3', () => {
        imports.gi.versions.Soup = '3.0';

        const client = GitHubClientFactory.newClient('my-domain', 'my-token');

        assert.instanceOf(client, GitHubClientImpl);
        assert.instanceOf((client as GitHubClientImpl).httpEngine, Soup3HttpEngine);
    });

    it('throws error if Soup version is not recogniezed', () => {
        imports.gi.versions.Soup = '5.3.7';

        assert.throws(() => GitHubClientFactory.newClient('my-domain', 'my-token'), 'Unsupported Soup version: 5.3.7');
    });
});
