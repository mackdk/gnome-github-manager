import { Icon } from '@gi-types/gio2';

export class Source {
    public notifications: Notification[];

    public constructor(_title: string, _iconName: string) {
        this.notifications = [];
    }

    public getIcon(): Icon {
        return new Icon();
    }

    public open(): void {}

    public destroy(reson?: string): void {}
}

export class Notification {

    public title: string;

    public banner: string;

    public source: Source;

    public constructor(source: Source, title: string, banner: string) {
        this.source = source;
        this.title = title;
        this.banner = banner;
    }

    public setTransient(_state: boolean): void {}

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
