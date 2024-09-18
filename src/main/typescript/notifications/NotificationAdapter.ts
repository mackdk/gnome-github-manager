import Gio from '@girs/gio-2.0';
import { gettext as _, ngettext } from '@girs/gnome-shell/dist/extensions/extension';
import {
    NotificationDestroyedReason,
    Source,
    Notification as UINotification,
} from '@girs/gnome-shell/dist/ui/messageTray';

import { GitHub } from '@github-manager/client';
import { NotificationMode } from '@github-manager/settings';
import { formatString } from '@github-manager/utils';
import { registerGObject } from '@github-manager/utils/gnome';

import { NotificationAction } from './actions/NotificationAction';

@registerGObject
class DigestSource extends Source {
    private readonly icon: Gio.Icon;

    public constructor(icon: Gio.Icon) {
        super('Github Notifications', '');

        this.icon = icon;
    }

    public getIcon(): Gio.Icon {
        return this.icon;
    }

    public open(): void {
        this.destroy(NotificationDestroyedReason.DISMISSED);
    }
}

@registerGObject
class ProjectSource extends Source {
    private readonly avatarUrl: string;
    private icon?: Gio.Icon;

    public constructor(projectName: string, avatarUrl: string) {
        super(projectName, '');

        this.avatarUrl = avatarUrl;
    }

    public getIcon(): Gio.Icon {
        if (this.icon === undefined) {
            this.icon = Gio.icon_new_for_string(this.avatarUrl);
        }

        return this.icon;
    }

    public open(): void {
        this.destroy(NotificationDestroyedReason.DISMISSED);
    }
}

export class NotificationAdapter {
    private _notificationMode: NotificationMode;

    private _activateAction?: NotificationAction;

    private _primaryAction?: NotificationAction;

    private _secondaryAction?: NotificationAction;

    private readonly digestIcon: Gio.Icon;

    public constructor(
        notificationMode: NotificationMode,
        digestIcon: Gio.Icon,
        activateAction?: NotificationAction,
        primaryAction?: NotificationAction,
        secondaryAction?: NotificationAction
    ) {
        this._notificationMode = notificationMode;
        this._activateAction = activateAction;
        this._primaryAction = primaryAction;
        this._secondaryAction = secondaryAction;

        this.digestIcon = digestIcon;
    }

    public get notificationMode(): NotificationMode {
        return this._notificationMode;
    }

    public set notificationMode(value: NotificationMode) {
        this._notificationMode = value;
    }

    public get activateAction(): NotificationAction | undefined {
        return this._activateAction;
    }

    public set activateAction(value: NotificationAction | undefined) {
        this._activateAction = value;
    }

    public get primaryAction(): NotificationAction | undefined {
        return this._primaryAction;
    }

    public set primaryAction(value: NotificationAction | undefined) {
        this._primaryAction = value;
    }

    public get secondaryAction(): NotificationAction | undefined {
        return this._secondaryAction;
    }

    public set secondaryAction(value: NotificationAction | undefined) {
        this._secondaryAction = value;
    }

    public adaptNotifications(oldData: GitHub.Thread[], newData: GitHub.Thread[]): UINotification[] {
        switch (this._notificationMode) {
            case NotificationMode.NONE:
                return [];

            case NotificationMode.SINGLE: {
                const updatedAtMap = new Map<string, Date>();
                oldData.forEach((notification) => updatedAtMap.set(notification.id, new Date(notification.updated_at)));

                return newData
                    .filter((notification) => this.isNotificationNeeded(updatedAtMap, notification))
                    .map((notification) => this.buildProjectNotification(notification));
            }

            case NotificationMode.DIGEST: {
                const oldIds = oldData.map((notification) => notification.id);
                const newNotifications = newData.filter((notification) => !oldIds.includes(notification.id));

                if (newNotifications.length === 0) {
                    return [];
                }

                return [this.buildDigestNotification(newData.length)];
            }
        }
    }

    private isNotificationNeeded(updatedAtMap: Map<string, Date>, notification: GitHub.Thread): boolean {
        const lastUpdatedAt = updatedAtMap.get(notification.id);
        return lastUpdatedAt === undefined || new Date(notification.updated_at) > lastUpdatedAt;
    }

    private buildProjectNotification(data: GitHub.Thread): UINotification {
        const notification = new UINotification(
            new ProjectSource(data.repository.name, data.repository.owner.avatar_url),
            data.repository.name,
            data.subject.title
        );

        this.setupCommonNotificationProperties(notification, data);

        return notification;
    }

    private buildDigestNotification(notificationCount: number): UINotification {
        const notification = new UINotification(
            new DigestSource(this.digestIcon),
            _('Github Notifications'),
            formatString(
                ngettext('You have one new notification.', 'You have {0} new notifications.', notificationCount),
                notificationCount
            )
        );

        this.setupCommonNotificationProperties(notification);

        return notification;
    }

    private setupCommonNotificationProperties(notification: UINotification, data?: GitHub.Thread): void {
        notification.isTransient = false;
        if (this._activateAction !== undefined) {
            const action = this._activateAction;
            notification.connect('activated', () => action.execute(data));
        }

        if (this._secondaryAction !== undefined) {
            const action = this._secondaryAction;
            notification.addAction(action.label, () => action.execute(data));
        }

        if (this._primaryAction !== undefined) {
            const action = this._primaryAction;
            notification.addAction(action.label, () => action.execute(data));
        }
    }
}
