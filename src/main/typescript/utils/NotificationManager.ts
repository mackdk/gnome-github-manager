import { icon_new_for_string, Icon } from '@gi-types/gio2';

const Me = imports.misc.extensionUtils.getCurrentExtension();
const MessageTray = imports.ui.messageTray;

export class NotificationManager {

    private readonly icon: Icon;

    public constructor() {
        this.icon = icon_new_for_string(`${Me.path}/github.svg`);
    }

    public notify(title: string, message: string) {
        const notificationSource : MessageTray.Source = new MessageTray.SystemNotificationSource();
        imports.ui.main.messageTray.add(notificationSource);

        const notification : MessageTray.Notification = new MessageTray.Notification(notificationSource, title, message, { gicon: this.icon });

        notification.setTransient(false);
        // notification.connect('activated', this.showBrowserUri.bind(this)); // Open on click

        notificationSource.showNotification(notification);
    }
}
