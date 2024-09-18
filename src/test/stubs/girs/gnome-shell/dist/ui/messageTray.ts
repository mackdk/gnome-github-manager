import Gio from '@girs/gio-2.0';

export enum NotificationDestroyedReason {
    EXPIRED = 1,
    DISMISSED = 2,
    SOURCE_CLOSED = 3,
    REPLACED = 4,
}

export class Source {
    public notifications: Notification[];

    public constructor(_title: string, _iconName: string) {
        this.notifications = [];
    }

    public getIcon(): Gio.Icon {
        return new Gio.Icon();
    }

    public open(): void {}

    public destroy(reson: NotificationDestroyedReason): void {}
}

export class Notification {

    public isTransient: boolean;

    public title: string;

    public banner: string;

    public source: Source;

    public constructor(source: Source, title: string, banner: string) {
        this.source = source;
        this.title = title;
        this.banner = banner;
        this.isTransient = false;
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
