import Gio from '@girs/gio-2.0';

import { NotificationController } from '@github-manager/notifications';
import { SettingsWrapper } from '@github-manager/settings';
import { Disposable, EventDispatcher, Logger, lazy } from '@github-manager/utils';
import { WidgetController } from '@github-manager/widget';

export class GitHubManager implements Disposable {
    @lazy
    private static readonly LOGGER: Logger = new Logger('core::GitHubManager');

    private readonly githubIcon: Gio.Icon;

    private readonly eventDispatcher: EventDispatcher;

    private readonly settings: SettingsWrapper;

    private readonly widgetController: WidgetController;

    private readonly notificationController: NotificationController;

    public constructor(name: string, path: string, settings: Gio.Settings) {
        GitHubManager.LOGGER.trace('Building and wiring components');

        this.githubIcon = Gio.icon_new_for_string(`${path}/github.svg`);

        this.eventDispatcher = new EventDispatcher();
        this.settings = new SettingsWrapper(settings, this.eventDispatcher);

        this.widgetController = new WidgetController(this.settings, this.eventDispatcher, this.githubIcon);
        this.notificationController = new NotificationController(
            name,
            this.settings,
            this.eventDispatcher,
            this.githubIcon
        );
    }

    public start(): void {
        GitHubManager.LOGGER.trace('Starting the notification polling loop');
        this.notificationController.startPolling();

        GitHubManager.LOGGER.trace('Adding the widget to the GNOME Shell UI');
        this.widgetController.show();
    }

    public stop(): void {
        GitHubManager.LOGGER.trace('Stopping the notification polling loop');
        this.notificationController.stopPolling();

        GitHubManager.LOGGER.trace('Removing the widget to the GNOME Shell UI');
        this.widgetController.hide();
    }

    public dispose(): void {
        GitHubManager.LOGGER.trace('Disposing all objects');
        this.settings.dispose();
        this.eventDispatcher.dispose();
        this.widgetController.dispose();
    }
}
