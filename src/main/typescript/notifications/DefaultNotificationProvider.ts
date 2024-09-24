import Gio from '@girs/gio-2.0';
import * as MessageTray from '@girs/gnome-shell/dist/ui/messageTray';

import { GitHub } from '@github-manager/client';

import { NotificationProvider } from './NotificationProvider';

export class DefaultNotificationProvider implements NotificationProvider {
    public newProjectNotification(data: GitHub.Thread): MessageTray.Notification {
        const repositoryName = data.repository.name;
        const repositoryIcon = Gio.icon_new_for_string(data.repository.owner.avatar_url);

        return new MessageTray.Notification({
            source: new MessageTray.Source({ title: repositoryName, icon: repositoryIcon }),
            title: repositoryName,
            body: data.subject.title,
            isTransient: false,
        });
    }

    public newDigestNotification(digestIcon: Gio.Icon, title: string, body: string): MessageTray.Notification {
        return new MessageTray.Notification({
            source: new MessageTray.Source({ title: 'Github Notification', icon: digestIcon }),
            title: title,
            body: body,
            isTransient: false,
        });
    }
}
