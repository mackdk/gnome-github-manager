import { Icon, icon_new_for_string } from '@gi-types/gio2';
import { getCurrentExtension, getSettings } from '@gnome-shell/misc/extensionUtils';

import { NotificationController } from '@github-manager/notifications';
import { SettingsWrapper } from '@github-manager/settings';
import { Disposable, EventDispatcher, Logger } from '@github-manager/utils';
import { WidgetController } from '@github-manager/widget';

export class GitHubManager implements Disposable {
    private static readonly LOGGER: Logger = new Logger('core::GitHubManager');

    private readonly githubIcon: Icon;

    private readonly eventDispatcher: EventDispatcher;

    private readonly settings: SettingsWrapper;

    private readonly widgetController: WidgetController;

    private readonly notificationController: NotificationController;

    public constructor() {
        GitHubManager.LOGGER.trace('Building and wiring components');

        this.githubIcon = icon_new_for_string(`${getCurrentExtension().path}/github.svg`);

        this.eventDispatcher = new EventDispatcher();
        this.settings = new SettingsWrapper(getSettings(), this.eventDispatcher);

        this.widgetController = new WidgetController(this.settings, this.eventDispatcher, this.githubIcon);
        this.notificationController = new NotificationController(this.settings, this.eventDispatcher, this.githubIcon);
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
