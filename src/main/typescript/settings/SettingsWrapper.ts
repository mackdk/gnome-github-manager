import { Settings } from '@gi-types/gio2';

import { EventDispatcher } from '@github-manager/utils';

import { NotificationActionType, NotificationMode } from './SettingsTypes';

export class SettingsWrapper {
    private readonly eventDispatcher: EventDispatcher;

    private readonly settings: Settings;

    public constructor(settings: Settings, eventDispatcher: EventDispatcher) {
        this.settings = settings;
        this.eventDispatcher = eventDispatcher;

        // Setup the internal change event listener
        this.settings.connect('changed', this.onChange.bind(this));
    }

    public get domain(): string {
        return this.settings.get_string('domain');
    }

    public get token(): string {
        return this.settings.get_string('token');
    }

    public get hideNotificationCount(): boolean {
        return this.settings.get_boolean('hide-notification-count');
    }

    public get refreshInterval(): number {
        return this.settings.get_int('refresh-interval');
    }

    public get notificationMode(): NotificationMode {
        const storedValue: number = this.settings.get_int('notification-mode');
        return SettingsWrapper.mapIntToEnum(storedValue, Object.keys(NotificationMode), NotificationMode.NONE);
    }

    public get showParticipatingOnly(): boolean {
        return this.settings.get_boolean('show-participating-only');
    }

    public get notificationActivateAction(): NotificationActionType {
        const storedValue: number = this.settings.get_int('notification-activate-action');
        return SettingsWrapper.mapIntToEnum(storedValue, NotificationActionType, NotificationActionType.NONE);
    }

    public get notificationPrimaryAction(): NotificationActionType {
        const storedValue: number = this.settings.get_int('notification-primary-action');
        return SettingsWrapper.mapIntToEnum(storedValue, NotificationActionType, NotificationActionType.NONE);
    }

    public get notificationSecondaryAction(): NotificationActionType {
        const storedValue: number = this.settings.get_int('notification-secondary-action');
        return SettingsWrapper.mapIntToEnum(storedValue, NotificationActionType, NotificationActionType.NONE);
    }

    private onChange(source: Settings, key: string): void {
        if (this.settings !== source) {
            return;
        }

        void this.eventDispatcher.emit('settingChanged', key);
    }

    private static mapIntToEnum<T extends Record<number, string | number>, V>(
        value: number,
        enumType: T,
        defaultValue: V
    ): V {
        const validValues: number[] = Object.keys(enumType)
            .map((s) => Number(s))
            .filter((v) => !isNaN(v));

        if (!validValues.includes(value)) {
            return defaultValue;
        }

        return value as V;
    }
}
