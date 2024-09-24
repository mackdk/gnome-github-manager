import Gio from '@girs/gio-2.0';
import { Notification } from '@girs/gnome-shell/dist/ui/messageTray';

import { GitHub } from '@github-manager/client';

export interface NotificationProvider {
    newProjectNotification(data: GitHub.Thread): Notification;

    newDigestNotification(digestIcon: Gio.Icon, title: string, body: string): Notification;
}
