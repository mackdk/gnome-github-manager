import Clutter from '@girs/clutter-10';
import Gio from '@girs/gio-2.0';
import GLib from '@girs/glib-2.0';
import GObject from '@girs/gobject-2.0';
import St from '@girs/st-1.0';

export interface NotificationProperties {
    gicon: Gio.Icon;
    secondaryGIcon: Gio.Icon;
    bannerMarkup: boolean;
    clear: boolean;
    datetime: GLib.DateTime;
    soundName: string;
    soundFile: string;
}

export class Notification extends GObject.Object {
    public constructor(source: Source, title: string, banner: string, params?: Partial<NotificationProperties>);

    public title: string;

    public banner: string;

    public source: Source;

    public addAction(label: string, callback: () => void): void;

    public createBanner(): NotificationBanner;

    public setTransient(state: boolean): void;
    public update(title: string, message: string, properties: Partial<NotificationProperties>): void;
}

// NotificationBanner actually extends Calendar.NotificationMessage but it's not needed for this project
export class NotificationBanner {
    public addButton(button: St.Button, callback: () => void): St.Button;
    public addAction(label: string, callback: () => void): St.Button;
}

export class Source extends GObject.Object {
    public notifications: Notification[];

    public constructor(title: string, iconName: string);

    public open(): void;
    public destroy(reson?: string): void;
    public getIcon(): Gio.Icon;

    public showNotification(notification: Notification): void;
    public pushNotification(notification: Notification): void;

    public createBanner(notification: Notification): NotificationBanner;
}

export class SystemNotificationSource extends Source {
    public constructor();
}

export interface MessageTray extends St.Widget {
    add(source: Source): void;
    contains(source: Source | Clutter.Actor): boolean;
}
