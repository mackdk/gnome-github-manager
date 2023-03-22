import { main as ShellUI } from '@gnome-shell/ui';
import { Notification as UINotification } from '@gnome-shell/ui/messageTray';

export * from './GitHubWidget';

export function notify(notifications: UINotification | UINotification[]): void {
    const items: UINotification[] = notifications instanceof UINotification ? [notifications] : notifications;

    items.forEach((notification) => {
        const source = notification.source;

        ShellUI.messageTray.add(source);
        source.showNotification(notification);
    });
}
