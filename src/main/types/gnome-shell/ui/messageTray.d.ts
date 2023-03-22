import { Actor } from '@gi-types/clutter10';
import { Icon } from '@gi-types/gio2';
import { DateTime } from '@gi-types/glib2';
import { Object as GObject } from '@gi-types/gobject2';
import { Button, Widget } from '@gi-types/st1';

export interface NotificationProperties {
    gicon: Icon;
    secondaryGIcon: Icon;
    bannerMarkup: boolean;
    clear: boolean;
    datetime: DateTime;
    soundName: string;
    soundFile: string;
}

export class Notification extends GObject {
    public constructor(source: Source, title: string, banner: string, params?: Partial<NotificationProperties>);

    public source: Source;

    public addAction(label: string, callback: () => void): void;

    public createBanner(): NotificationBanner;

    public setTransient(state: boolean): void;
    public update(title: string, message: string, properties: Partial<NotificationProperties>): void;
}

// NotificationBanner actually extends Calendar.NotificationMessage but it's not needed for this project
export class NotificationBanner {
    public addButton(button: Button, callback: () => void): Button;
    public addAction(label: string, callback: () => void): Button;
}

export class Source extends GObject {
    public notifications: Notification[];

    public constructor(title: string, iconName: string);

    public open(): void;
    public destroy(reson?: string): void;
    public getIcon(): Icon;

    public showNotification(notification: Notification): void;
    public pushNotification(notification: Notification): void;

    public createBanner(notification: Notification): NotificationBanner;
}

export class SystemNotificationSource extends Source {
    public constructor();
}

export interface MessageTray extends Widget {
    add(source: Source): void;
    contains(source: Source | Actor): boolean;
}
