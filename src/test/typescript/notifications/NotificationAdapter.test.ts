import { readFileSync } from 'fs';

import Gio from '@girs/gio-2.0';
import { testResource } from '@test-suite/testSupport';
import { assert } from 'chai';

import * as GitHub from '@github-manager/client/GitHubApiTypes';
import { NotificationAdapter } from '@github-manager/notifications/NotificationAdapter';
import { NotificationMode } from '@github-manager/settings/SettingsTypes';
import { disposeTranslationDomain, initializeTranslations } from '@github-manager/utils/locale';

import '@test-suite/globals';

describe('NotificationAdapter', () => {
    const digestIcon = new Gio.Icon();

    let adapter: NotificationAdapter;
    let threads: GitHub.Thread[];

    before(() => {
        const scenarioJSON = readFileSync(testResource('notifications.json'), { encoding: 'utf-8' });
        threads = JSON.parse(scenarioJSON) as GitHub.Thread[];

        initializeTranslations('testDomain');
    });

    after(() => {
        disposeTranslationDomain();
    });

    describe('Notification Mode - NONE', () => {
        beforeEach(() => {
            adapter = new NotificationAdapter(NotificationMode.NONE, digestIcon);
        });

        it('does not notify when notification mode is NONE', () => {
            adapter.notificationMode = NotificationMode.NONE;
            let uiNotifications = adapter.adaptNotifications([], threads);
            assert.equal(uiNotifications.length, 0);

            uiNotifications = adapter.adaptNotifications(threads, []);
            assert.equal(uiNotifications.length, 0);

            uiNotifications = adapter.adaptNotifications(threads, threads);
            assert.equal(uiNotifications.length, 0);
        });
    });

    describe('Notification Mode - DIGEST', () => {
        beforeEach(() => {
            adapter = new NotificationAdapter(NotificationMode.DIGEST, digestIcon);
        });

        it('notifies with all new threads', () => {
            const uiNotifications = adapter.adaptNotifications([], threads);

            assert.equal(uiNotifications.length, 1);
            assert.equal(uiNotifications[0].title, 'Github Notifications');
            assert.equal(uiNotifications[0].banner, 'You have 3 new notifications.');
        });

        it('notifies when only two threads are new', () => {
            const uiNotifications = adapter.adaptNotifications([threads[0]], [threads[0], threads[1], threads[2]]);

            assert.equal(uiNotifications.length, 1);
            assert.equal(uiNotifications[0].title, 'Github Notifications');
            assert.equal(uiNotifications[0].banner, 'You have 3 new notifications.');
        });

        it('notifies when threads change completely', () => {
            const uiNotifications = adapter.adaptNotifications([threads[0], threads[1]], [threads[2]]);

            assert.equal(uiNotifications.length, 1);
            assert.equal(uiNotifications[0].title, 'Github Notifications');
            assert.equal(uiNotifications[0].banner, 'You have one new notification.');
        });

        it('does not notify when no new threads are present', () => {
            const uiNotifications = adapter.adaptNotifications(threads, threads);

            assert.equal(uiNotifications.length, 0);
        });

        it('does not notify when all threads are removed', () => {
            const uiNotifications = adapter.adaptNotifications(threads, []);

            assert.equal(uiNotifications.length, 0);
        });
    });

    describe('Notification Mode - SINGLE', () => {
        beforeEach(() => {
            adapter = new NotificationAdapter(NotificationMode.SINGLE, digestIcon);
        });

        it('notifies with all new threads', () => {
            const uiNotifications = adapter.adaptNotifications([], threads);

            assert.equal(uiNotifications.length, 3);
            assert.equal(uiNotifications[0].title, 'gnome-github-manager');
            assert.equal(uiNotifications[0].banner, 'Sanity checks workflow run failed for unit-testing branch');

            assert.equal(uiNotifications[1].title, 'uyuni');
            assert.equal(uiNotifications[1].banner, 'Remove wrong dependencies from classpath');

            assert.equal(uiNotifications[2].title, 'uyuni-docs');
            assert.equal(uiNotifications[2].banner, 'explain using PTFs in SUSE Manager / Uyuni');
        });

        it('notifies when only two threads are new', () => {
            const uiNotifications = adapter.adaptNotifications([threads[0]], [threads[0], threads[1], threads[2]]);

            assert.equal(uiNotifications.length, 2);
            assert.equal(uiNotifications[0].title, 'uyuni');
            assert.equal(uiNotifications[0].banner, 'Remove wrong dependencies from classpath');

            assert.equal(uiNotifications[1].title, 'uyuni-docs');
            assert.equal(uiNotifications[1].banner, 'explain using PTFs in SUSE Manager / Uyuni');
        });

        it('notifies when threads change completely', () => {
            const uiNotifications = adapter.adaptNotifications([threads[0], threads[1]], [threads[2]]);

            assert.equal(uiNotifications.length, 1);
            assert.equal(uiNotifications[0].title, 'uyuni-docs');
            assert.equal(uiNotifications[0].banner, 'explain using PTFs in SUSE Manager / Uyuni');
        });

        it('notifies when one thread is updated', () => {
            const updateThreads = [threads[0], { ...threads[1] }, threads[2]];

            // Originally was 2023-06-12T07:53:11Z
            updateThreads[1].updated_at = '2023-06-14T13:15:05Z';

            const uiNotifications = adapter.adaptNotifications(threads, updateThreads);

            assert.equal(uiNotifications.length, 1);
            assert.equal(uiNotifications[0].title, 'uyuni');
            assert.equal(uiNotifications[0].banner, 'Remove wrong dependencies from classpath');
        });

        it('does not notify when no new threads are present', () => {
            const uiNotifications = adapter.adaptNotifications(threads, threads);

            assert.equal(uiNotifications.length, 0);
        });

        it('does not notify when all threads are removed', () => {
            const uiNotifications = adapter.adaptNotifications(threads, []);

            assert.equal(uiNotifications.length, 0);
        });
    });
});
