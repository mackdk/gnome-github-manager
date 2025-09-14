import Gio from '@girs/gio-2.0';
import * as MessageTray from '@girs/gnome-shell/dist/ui/messageTray';

import { GitHub } from '@github-manager/client';

import { NotificationProvider } from './NotificationProvider';

export class DefaultNotificationProvider implements NotificationProvider {
    private readonly projectSourceMap: Map<string, MessageTray.Source>;

    private digestSource: MessageTray.Source | undefined;

    public constructor() {
        this.projectSourceMap = new Map();
        this.digestSource = undefined;
    }

    public newProjectNotification(data: GitHub.Thread): MessageTray.Notification {
        const repositoryName = data.repository.name;
        const repositoryIcon = Gio.icon_new_for_string(data.repository.owner.avatar_url);
        const projectSource = this.getOrCreateProjectSource(repositoryName, repositoryIcon);

        return new MessageTray.Notification({
            source: projectSource,
            title: repositoryName,
            body: data.subject.title,
            isTransient: false,
        });
    }

    public newDigestNotification(digestIcon: Gio.Icon, title: string, body: string): MessageTray.Notification {
        if (this.digestSource === undefined) {
            this.digestSource = new MessageTray.Source({ title: 'Github Notification', icon: digestIcon });
            this.digestSource.connect('destroy', (_source, _reason) => {
                this.digestSource = undefined;
            });
        }

        return new MessageTray.Notification({
            source: this.digestSource,
            title: title,
            body: body,
            isTransient: false,
        });
    }

    private getOrCreateProjectSource(repositoryName: string, repositoryIcon: Gio.Icon): MessageTray.Source {
        let source: MessageTray.Source | undefined = this.projectSourceMap.get(repositoryName);
        if (source !== undefined) {
            return source;
        }

        source = new MessageTray.Source({ title: repositoryName, icon: repositoryIcon });
        source.connect('destroy', (_source, _reason) => {
            this.projectSourceMap.delete(repositoryName);
            source = undefined;
        });

        this.projectSourceMap.set(repositoryName, source);
        return source;
    }
}
