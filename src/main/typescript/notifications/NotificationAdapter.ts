import Gio from '@girs/gio-2.0';
import { gettext as _, ngettext } from '@girs/gnome-shell/dist/extensions/extension';
import { Notification } from '@girs/gnome-shell/dist/ui/messageTray';

import { GitHub } from '@github-manager/client';
import { NotificationMode } from '@github-manager/settings';
import { formatString } from '@github-manager/utils';

import { NotificationProvider } from './NotificationProvider';
import { NotificationAction } from './actions/NotificationAction';

export class NotificationAdapter {
    private _notificationMode: NotificationMode;

    private _activateAction?: NotificationAction;

    private _primaryAction?: NotificationAction;

    private _secondaryAction?: NotificationAction;

    private readonly digestIcon: Gio.Icon;

    private readonly notificationProvider: NotificationProvider;

    public constructor(
        notificationMode: NotificationMode,
        notificationProvider: NotificationProvider,
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
        this.notificationProvider = notificationProvider;
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

    public adaptNotifications(oldData: GitHub.Thread[], newData: GitHub.Thread[]): Notification[] {
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

    private buildProjectNotification(data: GitHub.Thread): Notification {
        const notification = this.notificationProvider.newProjectNotification(data);

        this.setupCommonNotificationProperties(notification, data);

        return notification;
    }

    private buildDigestNotification(notificationCount: number): Notification {
        const notification = this.notificationProvider.newDigestNotification(
            this.digestIcon,
            _('Github Notifications'),
            formatString(
                ngettext('You have one new notification.', 'You have {0} new notifications.', notificationCount),
                notificationCount
            )
        );

        this.setupCommonNotificationProperties(notification);

        return notification;
    }

    private setupCommonNotificationProperties(notification: Notification, data?: GitHub.Thread): void {
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
