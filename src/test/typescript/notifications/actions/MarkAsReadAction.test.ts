import { readFileSync } from 'fs';

import { GitHubClientStub, assertWithRetries, testResource } from '@test-suite/testSupport';
import { assert } from 'chai';
import { spy, stub } from 'sinon';

import * as GitHub from '@github-manager/client/GitHubApiTypes';
import { GitHubClient } from '@github-manager/client/GitHubClient';
import { MarkAsReadAction } from '@github-manager/notifications/actions/MarkAsReadAction';
import { EventDispatcher } from '@github-manager/utils';

describe('Mark As Read Action', () => {
    let thread: GitHub.Thread;
    let action: MarkAsReadAction;

    let githubClient: GitHubClient;
    let eventDispatcher: EventDispatcher;

    before(() => {
        const scenarioJSON = readFileSync(testResource('../notifications.json'), { encoding: 'utf-8' });
        thread = (JSON.parse(scenarioJSON) as GitHub.Thread[])[0];
    });

    beforeEach(() => {
        githubClient = new GitHubClientStub();
        eventDispatcher = new EventDispatcher();

        action = new MarkAsReadAction(githubClient, eventDispatcher);
    });

    describe('On a single notification', () => {
        it('can mark it as read', () => {
            const markThreadAsReadSpy = spy(githubClient, 'markThreadAsRead');
            const emitSpy = spy(eventDispatcher, 'emit');

            action.execute(thread);

            void assertWithRetries('Notification is correctly marked as read', 10, 150, () => {
                assert.equal(markThreadAsReadSpy.callCount, 1);
                assert.equal(markThreadAsReadSpy.firstCall.args.length, 1);
                assert.equal(markThreadAsReadSpy.firstCall.firstArg, thread);

                assert.equal(emitSpy.callCount, 1);
                assert.equal(emitSpy.firstCall.args.length, 2);
                assert.equal(emitSpy.firstCall.args[0], 'notificationRead');
                assert.equal(emitSpy.firstCall.args[1], thread.id);
            });
        });

        it('does nothing if GitHub call fails', () => {
            const emitSpy = spy(eventDispatcher, 'emit');
            stub(githubClient, 'markThreadAsRead').throws(new Error('Api Error'));

            assert.doesNotThrow(() => action.execute(thread));
            assert.isTrue(emitSpy.notCalled);
        });
    });

    describe('On all notifications', () => {
        it('can mark them as read', () => {
            const markAllThreadsAsReadSpy = spy(githubClient, 'markAllThreadsAsRead');
            const emitSpy = spy(eventDispatcher, 'emit');

            action.execute();

            void assertWithRetries('All notifications are marked as read', 10, 150, () => {
                assert.equal(markAllThreadsAsReadSpy.callCount, 1);
                assert.equal(markAllThreadsAsReadSpy.firstCall.args.length, 0);

                assert.equal(emitSpy.callCount, 1);
                assert.equal(emitSpy.firstCall.args.length, 1);
                assert.equal(emitSpy.firstCall.args[0], 'allNotificationsRead');
            });
        });

        it('does nothing if GitHub call fails', () => {
            const emitSpy = spy(eventDispatcher, 'emit');
            stub(githubClient, 'markAllThreadsAsRead').throws(new Error('Api Error'));

            assert.doesNotThrow(() => action.execute());
            assert.isTrue(emitSpy.notCalled);
        });
    });
});
