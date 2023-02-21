import { Settings, SettingsBindFlags } from '@gi-types/gio2';
import { Widget } from '@gi-types/gtk4';
import { getSettings } from '@gnome-shell/misc/extensionUtils';

export type ConfigurationChangeListener = (property: string) => void;

export class Configuration {
    private static instance?: Configuration;

    private settings: Settings;

    private changeListeners: Map<number, ConfigurationChangeListener>;

    private currentHandle: number;

    private constructor(settings: Settings) {
        this.settings = settings;
        this.changeListeners = new Map<number, ConfigurationChangeListener>();
        this.currentHandle = 0;

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

    public get showAlert(): boolean {
        return this.settings.get_boolean('show-alert');
    }

    public get showParticipatingOnly(): boolean {
        return this.settings.get_boolean('show-participating-only');
    }

    public addChangeListener(listener: ConfigurationChangeListener): number {
        this.changeListeners.set(this.currentHandle, listener);
        return this.currentHandle++;
    }

    public removeChangeListener(handle: number): void {
        this.changeListeners.delete(handle);
    }

    public bind(property: string, widget: Widget, widgetProperty: string): void {
        this.settings.bind(Configuration.property2key(property), widget, widgetProperty, SettingsBindFlags.DEFAULT);
    }

    public reset(): void {
        this.listProperties()
            .map((prop) => Configuration.property2key(prop))
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

        this.changeListeners.forEach((listener) => {
            listener(Configuration.key2property(key));
        });
    }

    private listProperties(): string[] {
        const propertyDescriptor = Object.getOwnPropertyDescriptors(Reflect.getPrototypeOf(this));
        return Object.entries(propertyDescriptor)
            .filter((entry) => typeof entry[1].get === 'function' && entry[0] !== '__proto__')
            .map((entry) => entry[0]);
    }

    private static key2property(key: string): string {
        return key.toLowerCase().replace(/-+(.)/g, (_: string, chr: string) => chr.toUpperCase());
    }

    private static property2key(property: string): string {
        return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    }

    public static getInstance(): Configuration {
        if (Configuration.instance === undefined) {
            Configuration.instance = new Configuration(getSettings());
        }

        return Configuration.instance;
    }
}
