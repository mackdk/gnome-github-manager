import { Settings } from '@gi-types/gio2';
import { assert } from 'chai';
import { SinonSpy, SinonStub, match, spy, stub } from 'sinon';

import { NotificationActionType, NotificationMode } from '@github-manager/settings/SettingsTypes';
import { SettingsWrapper } from '@github-manager/settings/SettingsWrapper';
import { EventDispatcher } from '@github-manager/utils/EventDispatcher';

type SettingsConnectParameters = [signal: string, callback: (_source: Settings, key: string) => void];

describe('SettingsWrapper', () => {
    let eventDispatcher: EventDispatcher;
    let settings: Settings;

    beforeEach(() => {
        // Default implementation to allow stubbing
        eventDispatcher = new EventDispatcher();
        settings = new Settings();
    });

    it('can send event when change is triggered', () => {
        const emitStub = stub(eventDispatcher, 'emit');
        // Typescript cannot infer the correct type, let's explicitly cast it
        const connectSpy = spy(settings, 'connect') as SinonSpy<SettingsConnectParameters, number>;

        const settingsWrapper = new SettingsWrapper(settings, eventDispatcher);
        assert.isObject(settingsWrapper);
        assert.isTrue(connectSpy.calledWith('changed', match.func));

        settings.emit('changed', 'domain');

        assert.isTrue(emitStub.calledOnceWith('settingChanged', 'domain'));
    });

    it('can retrieve simple settings values', () => {
        const getStringStub = stub(settings, 'get_string').withArgs('domain').returns('github.com');
        const getBooleanStub = stub(settings, 'get_boolean').withArgs('hide-notification-count').returns(true);
        const getIntStub = stub(settings, 'get_int').withArgs('refresh-interval').returns(300);

        const settingsWrapper = new SettingsWrapper(settings, eventDispatcher);

        assert.strictEqual(settingsWrapper.domain, 'github.com');
        assert.isTrue(getStringStub.calledOnce);
        assert.strictEqual(settingsWrapper.hideNotificationCount, true);
        assert.isTrue(getBooleanStub.calledOnce);
        assert.strictEqual(settingsWrapper.refreshInterval, 300);
        assert.isTrue(getIntStub.calledOnce);
    });

    it('can retrieve enum values', () => {
        stub(settings, 'get_int')
            .withArgs('notification-mode')
            .returns(0)
            .withArgs('notification-activate-action')
            .returns(2)
            .withArgs('notification-primary-action')
            .returns(3);

        const settingsWrapper = new SettingsWrapper(settings, eventDispatcher);

        assert.strictEqual(settingsWrapper.notificationMode, NotificationMode.NONE);
        assert.strictEqual(settingsWrapper.notificationActivateAction, NotificationActionType.MARK_READ);
        assert.strictEqual(settingsWrapper.notificationPrimaryAction, NotificationActionType.DISMISS);
    });

    it('disconnects from settings on dispose', () => {
        const disconnectSpy = spy(settings, 'disconnect');
        const connectStub = stub(settings, 'connect') as SinonStub<SettingsConnectParameters, number>;

        // Generate a random id to be returned by the connect method
        const randomId = Math.floor(Math.random() % 100);
        connectStub.withArgs('changed', match.func).returns(randomId);

        const settingsWrapper = new SettingsWrapper(settings, eventDispatcher);
        settingsWrapper.dispose();

        // Verify disconnect is called with the id received from connect
        assert.isTrue(disconnectSpy.calledOnceWith(randomId));
    });
});
