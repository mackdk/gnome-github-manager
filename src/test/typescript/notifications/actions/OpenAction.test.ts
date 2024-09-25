import { readFileSync } from 'fs';

import Gtk from '@girs/gtk-4.0';
import { GitHubClientStub, assertWithRetries, testResource } from '@test-suite/testSupport';
import { assert } from 'chai';
import { SinonSpy, spy, stub } from 'sinon';

import * as GitHub from '@github-manager/client/GitHubApiTypes';
import { GitHubClient } from '@github-manager/client/GitHubClient';
import { OpenAction } from '@github-manager/notifications/actions/OpenAction';
import { EventDispatcher } from '@github-manager/utils/EventDispatcher';

describe('Open Action', () => {
    let thread: GitHub.Thread;
    let action: OpenAction;

    let githubClient: GitHubClient;
    let eventDispatcher: EventDispatcher;

    let showUriSpy: SinonSpy<[parent: Gtk.Window | null, uri: string, timestamp: number], void>;

    before(() => {
        const scenarioJSON = readFileSync(testResource('../notifications.json'), { encoding: 'utf-8' });
        thread = (JSON.parse(scenarioJSON) as GitHub.Thread[])[0];

        showUriSpy = spy(Gtk, 'show_uri');
    });

    beforeEach(() => {
        githubClient = new GitHubClientStub();
        eventDispatcher = new EventDispatcher();

        action = new OpenAction(githubClient, eventDispatcher);

        showUriSpy.resetHistory();
    });

    after(() => {
        showUriSpy.restore();
    });

    describe('On a single notification', () => {
        it('opens its web page', () => {
            const getWebUrlStub = stub(githubClient, 'getWebUrlForSubject').returns(
                Promise.resolve('http://example.com')
            );
            const emitSpy = spy(eventDispatcher, 'emit');

            action.execute(thread);

            void assertWithRetries('dependencies correctly called', 10, 150, () => {
                assert.equal(getWebUrlStub.callCount, 1);
                assert.equal(getWebUrlStub.firstCall.args.length, 1);
                assert.equal(getWebUrlStub.firstCall.firstArg, thread.subject);

                assert.equal(showUriSpy.callCount, 1);
                assert.equal(showUriSpy.firstCall.args.length, 3);
                assert.isNull(showUriSpy.firstCall.args[0]);
                assert.equal(showUriSpy.firstCall.args[1], 'http://example.com');

                assert.equal(emitSpy.callCount, 1);
                assert.equal(emitSpy.firstCall.args.length, 2);
                assert.equal(emitSpy.firstCall.args[0], 'notificationRead');
                assert.equal(emitSpy.firstCall.args[1], thread.id);
            });
        });

        it('opens notification page when cannot retrieve url', () => {
            const emitSpy = spy(eventDispatcher, 'emit');

            stub(githubClient, 'getWebUrlForSubject').throws(new Error('API Error'));
            assert.doesNotThrow(() => action.execute(thread));

            void assertWithRetries('dependencies correctly called', 10, 150, () => {
                assert.isTrue(emitSpy.notCalled);

                assert.equal(showUriSpy.callCount, 1);
                assert.equal(showUriSpy.firstCall.args.length, 3);
                assert.isNull(showUriSpy.firstCall.args[0]);
                assert.equal(showUriSpy.firstCall.args[1], 'http://stub.domain.com/notifications');
            });
        });
    });

    describe('On all notifications', () => {
        it('opens notification page', () => {
            const getWebUrlStub = spy(githubClient, 'getWebUrlForSubject');
            const emitSpy = spy(eventDispatcher, 'emit');

            action.execute();

            void assertWithRetries('dependencies correctly called', 10, 150, () => {
                assert.isTrue(getWebUrlStub.notCalled);
                assert.isTrue(emitSpy.notCalled);

                assert.equal(showUriSpy.callCount, 1);
                assert.equal(showUriSpy.firstCall.args.length, 3);
                assert.isNull(showUriSpy.firstCall.args[0]);
                assert.equal(showUriSpy.firstCall.args[1], 'http://stub.domain.com/notifications');
            });
        });
    });
});
