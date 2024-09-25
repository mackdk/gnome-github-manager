import Gio from '@girs/gio-2.0';

export enum NotificationDestroyedReason {
    EXPIRED = 1,
    DISMISSED = 2,
    SOURCE_CLOSED = 3,
    REPLACED = 4,
}

export interface NotificationConstructorProperties {
    source: Source | null;
    title: string | null;
    body: string | null;
    isTransient: boolean;
}

interface SourceConstructorProperties {
    title: string;
    icon: Gio.Icon;
}

export class Source {
    public title: string;

    public icon: Gio.Icon;

    public constructor(props: SourceConstructorProperties) {
        // GNOME 45 Source constructor has 2 parameters, while from 46 the new implementation has only one.
        // This arguments check makes sure this stub adheres with the new signature but works also with the legacy code.
        if (arguments.length === 1) {
            this.title = props.title;
            this.icon = props.icon;
        } else if(arguments.length === 2) {
            this.title = arguments[0] as string;
            this.icon = {};
        } else {
            throw new Error(`No constructor with ${arguments.length} exists.`);
        }
    }

    public addNotification(notification: Notification) {}

    public destroy(reason: NotificationDestroyedReason) {}
}

export class Notification {

    public isTransient: boolean;

    public title: string | null;

    public body: string | null;

    public bannerBodyText: string | null;

    public source: Source | null;

    public constructor(props: NotificationConstructorProperties) {
        // GNOME 45 Notification constructor has 3 parameters, while from 46 the new implementation has only one.
        // This arguments check makes sure this stub adheres with the new signature but works also with the legacy code.
        if (arguments.length === 1) {
            this.source = props.source;
            this.title = props.title;
            this.body = props.body;
            this.bannerBodyText = null;
            this.isTransient = props.isTransient;
        } else if (arguments.length === 3) {
            this.source = arguments[0] as Source;
            this.title = arguments[1] as string;
            this.body = null;
            this.bannerBodyText = arguments[2] as string;
            this.isTransient = true;
        } else {
            throw new Error(`No constructor with ${arguments.length} exists.`);
        }
    }

    public connect(_id: string, _callback: () => void): number {
        return 0;
    }

    public addAction(_label: string, _callback: () => void): void {}
}

export class MessageTray {
    public add(source: Source): void {}

    public contains(source: Source): boolean {
        return true;
    }
}
