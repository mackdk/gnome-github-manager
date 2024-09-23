import Gdk from '@girs/gdk-4.0';
import Gio from '@girs/gio-2.0';
import { Extension } from '@girs/gnome-shell/dist/extensions/extension';
import * as ShellUI from '@girs/gnome-shell/dist/ui/main';
import Gtk from '@girs/gtk-4.0';

import { SettingsWrapper } from '@github-manager/settings';
import { Disposable, EventDispatcher, Logger, lazy } from '@github-manager/utils';

import { GitHubWidget } from './GitHubWidget';

export class WidgetController implements Disposable {
    @lazy
    private static readonly LOGGER: Logger = new Logger('widget::WidgetController');

    private readonly settings: SettingsWrapper;

    private readonly widget: GitHubWidget;

    private readonly buttonPressId: number;

    public constructor(settings: SettingsWrapper, eventDispatcher: EventDispatcher, githubIcon: Gio.Icon) {
        this.settings = settings;
        this.widget = new GitHubWidget(githubIcon, '0');
        this.buttonPressId = this.widget.connect('button-press-event', (_: this, event: Gdk.ButtonEvent) =>
            this.handleButtonPress(event)
        );

        // Listen to configuration changes
        eventDispatcher.addEventListener('settingChanged', this.settingChanged.bind(this));
        // Respond to updated notification requests
        eventDispatcher.addEventListener('updateNotificationCount', this.updateNotificationCount.bind(this));
    }

    public show(): boolean {
        ShellUI.panel.addToStatusArea('GithubManager', this.widget, 0, 'right');
        return true;
    }

    public hide(): boolean {
        this.widget.visible = false;
        return false;
    }

    public dispose(): void {
        this.widget.disconnect(this.buttonPressId);
        this.widget.destroy();
    }

    public setText(text: string): void {
        this.widget.text = text;
    }

    private handleButtonPress(event: Gdk.ButtonEvent): void {
        switch (event.get_button()) {
            case Gdk.BUTTON_PRIMARY:
                try {
                    let url = `https://${this.settings.domain}/notifications`;
                    if (this.settings.showParticipatingOnly) {
                        url = url.concat('/participating');
                    }

                    Gtk.show_uri(null, url, Gdk.CURRENT_TIME);
                } catch (e) {
                    WidgetController.LOGGER.error('Cannot open uri', e);
                }
                break;
            case Gdk.BUTTON_SECONDARY:
                this.openPreferences();
                break;
        }
    }

    private updateNotificationCount(notificationCount?: number): void {
        this.widget.text = `${notificationCount ?? '!'}`;
    }

    private settingChanged(setting: string): void {
        WidgetController.LOGGER.debug("Attempting to change setting '{0}'", setting);
        switch (setting) {
            case 'hide-notification-count':
                this.updateButtonVisibility();
                break;

            case 'show-participating-only':
                // Nothing to do, method gets everytime the most updated value
                break;

            default:
                // Other settings are not of any interest for this controller
                return;
        }

        WidgetController.LOGGER.debug("Setting '{0}' is changed", setting);
    }

    private updateButtonVisibility(): void {
        this.widget.textVisible = !this.settings.hideNotificationCount;
    }

    private openPreferences(): void {
        const extension = Extension.lookupByUUID('github-manager@mackdk-on-github');
        if (extension === null) {
            WidgetController.LOGGER.error('Cannot open preferences: unable to retrieve extension');
            return;
        }

        extension.openPreferences();
    }
}
