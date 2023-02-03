import { Object } from '@gi-types/gobject2';
import { Icon, ThemedIcon } from '@gi-types/gio2';
import { DateTime } from '@gi-types/glib2';
import { Widget } from '@gi-types/st1';

export interface NotificationProperties {
    gicon: Icon,
    secondaryGIcon: Icon,
    bannerMarkup: boolean,
    clear: boolean,
    datetime: DateTime,
    soundName: string,
    soundFile: string,
}

export class Notification extends Object {
    public constructor(notificationSource: Source, title: string, banner: string, params: Partial<NotificationProperties>);
    public setTransient(state: boolean): void;
    public update(title: string, message: string, properties: Partial<NotificationProperties>): void;
}

export class Source extends Object {
    public notifications: Notification[];

    public constructor(title: string, iconName: string);
    public getIcon(): ThemedIcon;

    public showNotification(notification: Notification): void;
    public pushNotification(notification: Notification): void;
}

export class SystemNotificationSource extends Source {
    public constructor();
}

export interface MessageTray extends Widget {
    add(notificationSource: Source): void;
}
