import { icon_new_for_string } from '@gi-types/gio2';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { Configuration } from '@github-manager/common';
import { NotificationController } from '@github-manager/notifications';
import { EventDispatcher, Logger } from '@github-manager/utils';
import { WidgetController } from '@github-manager/widget/WidgetController';

export class GitHubManager {
    private static readonly LOGGER: Logger = new Logger('core::GitHubManager');

    private readonly widgetController: WidgetController;

    private readonly notificationController: NotificationController;

    public constructor() {
        GitHubManager.LOGGER.debug('Building and wiring components');

        const githubIcon = icon_new_for_string(`${getCurrentExtension().path}/github.svg`);

        const eventDispatcher = EventDispatcher.getInstance();
        const configuration = Configuration.getInstance();

        this.widgetController = new WidgetController(configuration, eventDispatcher, githubIcon);
        this.notificationController = new NotificationController(configuration, eventDispatcher, githubIcon);
    }

    public start(): void {
        GitHubManager.LOGGER.debug('Starting the notification polling loop');
        this.notificationController.startPolling();

        GitHubManager.LOGGER.debug('Adding the widget to the GNOME Shell UI');
        this.widgetController.show();
    }

    public stop(): void {
        GitHubManager.LOGGER.debug('Stopping the notification polling loop');
        this.notificationController.stopPolling();

        GitHubManager.LOGGER.debug('Removing the widget to the GNOME Shell UI');
        this.widgetController.hide();
    }
}
