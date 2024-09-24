import Gio from '@girs/gio-2.0';
import * as MessageTray from '@girs/gnome-shell/dist/ui/messageTray';

import { GitHub } from '@github-manager/client';
import { registerGObject } from '@github-manager/utils/gnome';

import { NotificationProvider } from './NotificationProvider';

// Extend GNOME 45 types to make them compatible with modern APIs
type Gnome45Source = MessageTray.Source & {
    showNotification(notification: MessageTray.Notification): void;
};

@registerGObject
class LegacyNotification extends MessageTray.Notification {
    public body: string;

    public constructor(source: MessageTray.Source, name: string, body: string) {
        // @ts-expect-error This constructor is available only in GNOME 45
        super(source, name, body);

        this.isTransient = false;
        this.body = body;
    }
}

@registerGObject
class DigestSource extends MessageTray.Source {
    private readonly digistIcon: Gio.Icon;

    public constructor(icon: Gio.Icon) {
        // @ts-expect-error This constructor is available only in GNOME 45
        super('Github Notifications', '');

        this.digistIcon = icon;
    }

    public addNotification(notification: MessageTray.Notification): void {
        (this as unknown as Gnome45Source).showNotification(notification);
    }

    public getIcon(): Gio.Icon {
        return this.digistIcon;
    }

    public open(): void {
        this.destroy(MessageTray.NotificationDestroyedReason.DISMISSED);
    }
}

@registerGObject
class ProjectSource extends MessageTray.Source {
    private readonly avatarUrl: string;
    private privateIcon?: Gio.Icon;

    public constructor(projectName: string, avatarUrl: string) {
        // @ts-expect-error This constructor is available only in GNOME 45
        super(projectName, '');

        this.avatarUrl = avatarUrl;
    }

    public addNotification(notification: MessageTray.Notification): void {
        (this as unknown as Gnome45Source).showNotification(notification);
    }

    public getIcon(): Gio.Icon {
        if (this.privateIcon === undefined) {
            this.privateIcon = Gio.icon_new_for_string(this.avatarUrl);
        }

        return this.privateIcon;
    }

    public open(): void {
        this.destroy(MessageTray.NotificationDestroyedReason.DISMISSED);
    }
}

export class LegacyNotificationProvider implements NotificationProvider {
    public newProjectNotification(data: GitHub.Thread): MessageTray.Notification {
        return new LegacyNotification(
            new ProjectSource(data.repository.name, data.repository.owner.avatar_url),
            data.repository.name,
            data.subject.title
        );
    }

    public newDigestNotification(digestIcon: Gio.Icon, title: string, body: string): MessageTray.Notification {
        return new LegacyNotification(new DigestSource(digestIcon), title, body);
    }
}
