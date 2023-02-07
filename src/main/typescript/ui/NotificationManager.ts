import { Icon } from '@gi-types/gio2';
import { main as ShellUI } from '@gnome-shell/ui';
import { Source, SystemNotificationSource, Notification } from '@gnome-shell/ui/messageTray';

export class NotificationManager {

    private readonly icon: Icon;

    public constructor(defaultIcon: Icon) {
        this.icon = defaultIcon;
    }

    public notify(title: string, message: string) {
        const notificationSource : Source = new SystemNotificationSource();
        ShellUI.messageTray.add(notificationSource);

        const notification : Notification = new Notification(notificationSource, title, message, { gicon: this.icon });

        notification.setTransient(false);
        // notification.connect('activated', this.showBrowserUri.bind(this)); // Open on click

        notificationSource.showNotification(notification);
    }
}
