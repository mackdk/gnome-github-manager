import { Settings } from '@gi-types/gio2';

export type ConfigurationChangeListener = (property: string) => void;

export class Configuration {

    private settings: Settings;

    private changeListeners: ConfigurationChangeListener[];

    public get domain(): string {
        return this.settings.get_string('domain');
    }

    public get token(): string {
        return this.settings.get_string('token');
    }

    public get handle(): string {
        return this.settings.get_string('handle');
    }

    public get hideWidget(): boolean {
        return this.settings.get_boolean('hide-widget');
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

    private constructor(settings: Settings) {
        this.settings = settings;
        this.changeListeners = [];

        // Setup the internal change event listener
        this.settings.connect('changed', this.onChange.bind(this));
    }

    public addChangeListener(listener: ConfigurationChangeListener): number {
        return this.changeListeners.push(listener) - 1;
    }

    public removeChangeListener(handle: number) {
        if (handle > 0 && handle < this.changeListeners.length) {
            delete this.changeListeners[handle];
        }
    }

    private onChange(source: Settings, key: string) {
        if (this.settings !== source) {
            return;
        }

        this.changeListeners.forEach(listener => {
            listener(Configuration.key2property(key));
        });
    }

    private static key2property(key: string): string {
        return key.toLowerCase().replace(/[-]+(.)/g, (m, chr) => chr.toUpperCase());
    }

    public static wrap(settings: Settings) : Configuration {
        return new Configuration(settings);
    }
}
