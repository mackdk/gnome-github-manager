import { Settings, SettingsBindFlags } from '@gi-types/gio2';
import { Widget } from '@gi-types/gtk4';
import { getSettings } from '@gnome-shell/misc/extensionUtils';

import { EventDispatcher, StringUtils } from '@github-manager/utils';

export type ConfigurationChangeListener = (property: string) => void;

export enum NotificationMode {
    NONE,
    SINGLE,
    DIGEST,
}

export enum NotificationActionType {
    NONE,
    OPEN,
    MARK_READ,
    DISMISS,
}

export class Configuration {
    private static instance?: Configuration;

    private readonly eventDispatcher: EventDispatcher;

    private readonly settings: Settings;

    private constructor(settings: Settings, eventDispatcher: EventDispatcher) {
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
        return Configuration.mapIntToEnum(storedValue, Object.keys(NotificationMode), NotificationMode.NONE);
    }

    public get showParticipatingOnly(): boolean {
        return this.settings.get_boolean('show-participating-only');
    }

    public get notificationActivateAction(): NotificationActionType {
        const storedValue: number = this.settings.get_int('notification-activate-action');
        return Configuration.mapIntToEnum(storedValue, NotificationActionType, NotificationActionType.NONE);
    }

    public get notificationPrimaryAction(): NotificationActionType {
        const storedValue: number = this.settings.get_int('notification-primary-action');
        return Configuration.mapIntToEnum(storedValue, NotificationActionType, NotificationActionType.NONE);
    }

    public get notificationSecondaryAction(): NotificationActionType {
        const storedValue: number = this.settings.get_int('notification-secondary-action');
        return Configuration.mapIntToEnum(storedValue, NotificationActionType, NotificationActionType.NONE);
    }

    public bind(property: string, widget: Widget, widgetProperty: string): void {
        this.settings.bind(StringUtils.camelToKekab(property), widget, widgetProperty, SettingsBindFlags.DEFAULT);
    }

    public reset(): void {
        this.listProperties()
            .map((prop) => StringUtils.camelToKekab(prop))
            .forEach((key) => {
                const defaultValue = this.settings.get_default_value(key);

                if (defaultValue) {
                    this.settings.set_value(key, defaultValue);
                }
            });
    }

    private onChange(source: Settings, key: string): void {
        if (this.settings !== source) {
            return;
        }

        void this.eventDispatcher.emit('configurationPropertyChanged', StringUtils.kebabToCamel(key));
    }

    private listProperties(): string[] {
        const propertyDescriptor = Object.getOwnPropertyDescriptors(Reflect.getPrototypeOf(this));
        return Object.entries(propertyDescriptor)
            .filter((entry) => typeof entry[1].get === 'function' && entry[0] !== '__proto__')
            .map((entry) => entry[0]);
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

    public static getInstance(): Configuration {
        if (Configuration.instance === undefined) {
            Configuration.instance = new Configuration(getSettings(), EventDispatcher.getInstance());
        }

        return Configuration.instance;
    }
}
