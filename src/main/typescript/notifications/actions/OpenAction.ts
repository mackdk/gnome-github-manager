import Clutter from '@girs/clutter-13';
import { gettext as _ } from '@girs/gnome-shell/dist/extensions/extension';
import Gtk from '@girs/gtk-4.0';

import { ApiError, GitHub, GitHubClient } from '@github-manager/client';
import { EventDispatcher, Logger, lazy } from '@github-manager/utils';

import { NotificationAction } from './NotificationAction';

export class OpenAction implements NotificationAction {
    @lazy
    private static readonly LOGGER: Logger = new Logger('notifications::actions::OpenAction');

    private readonly gitHubClient: GitHubClient;

    private readonly eventDispatcher: EventDispatcher;

    public constructor(githubClient: GitHubClient, eventDispatcher: EventDispatcher) {
        this.gitHubClient = githubClient;
        this.eventDispatcher = eventDispatcher;
    }

    public get label(): string {
        return _('Open');
    }

    public execute(notification?: GitHub.Thread): void {
        if (notification !== undefined) {
            this.openSingle(notification);
            return;
        }

        // No specific notification selected, action on a digest notification
        Gtk.show_uri(null, `https://${this.gitHubClient.domain}/notifications`, Clutter.CURRENT_TIME);
    }

    private openSingle(notification: GitHub.Thread): void {
        void Promise.resolve()
            .then(() => this.gitHubClient.getWebUrlForSubject(notification.subject))
            .then((url) => Gtk.show_uri(null, url, Clutter.CURRENT_TIME))
            .then(() => this.eventDispatcher.emit('notificationRead', notification.id))
            .catch((error) => {
                if (error instanceof ApiError) {
                    OpenAction.LOGGER.error(
                        'Cannot open notification {0}: HTTP error {1}: {2}',
                        notification.id,
                        error.statusCode,
                        error.message,
                        error.cause
                    );
                } else {
                    OpenAction.LOGGER.error('Cannot open notification {0}', notification.id, error);
                }

                // Fallback opening the notifications page
                Gtk.show_uri(null, `https://${this.gitHubClient.domain}/notifications`, Clutter.CURRENT_TIME);
            });
    }
}
