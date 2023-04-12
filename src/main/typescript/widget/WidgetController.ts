import { CURRENT_TIME } from '@gi-types/clutter10';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, ButtonEvent } from '@gi-types/gdk4';
import { Icon as GioIcon } from '@gi-types/gio2';
import { show_uri } from '@gi-types/gtk4';
import { openPrefs } from '@gnome-shell/misc/extensionUtils';
import { main as ShellUI } from '@gnome-shell/ui';

import { SettingsWrapper } from '@github-manager/settings';
import { Disposable, EventDispatcher, Logger } from '@github-manager/utils';

import { GitHubWidget } from './GitHubWidget';

export class WidgetController implements Disposable {
    private static readonly LOGGER: Logger = new Logger('widget::WidgetController');

    private readonly settings: SettingsWrapper;

    private readonly widget: GitHubWidget;

    private readonly buttonPressId: number;

    public constructor(settings: SettingsWrapper, eventDispatcher: EventDispatcher, githubIcon: GioIcon) {
        this.settings = settings;
        this.widget = new GitHubWidget(githubIcon, '0');
        this.buttonPressId = this.widget.connect('button-press-event', (_: this, event: ButtonEvent) =>
            this.handleButtonPress(event)
        );

        // Listen to configuration changes
        eventDispatcher.addEventListener('settingChanged', this.settingChanged.bind(this));
        // Respond to updated notifcation requests
        eventDispatcher.addEventListener('updateNotificationCount', this.updateNotificationCount.bind(this));
    }

    public show(): boolean {
        const container = ShellUI.panel._rightBox;
        if (container.contains(this.widget)) {
            return false;
        }

        container.insert_child_at_index(this.widget, 0);
        return true;
    }

    public hide(): boolean {
        const container = ShellUI.panel._rightBox;
        if (container.contains(this.widget)) {
            container.remove_child(this.widget);
            return true;
        }

        return false;
    }

    public dispose(): void {
        this.widget.disconnect(this.buttonPressId);
        this.widget.destroy();
    }

    public setText(text: string): void {
        this.widget.text = text;
    }

    private handleButtonPress(event: ButtonEvent): void {
        switch (event.get_button()) {
            case BUTTON_PRIMARY:
                try {
                    let url = `https://${this.settings.domain}/notifications`;
                    if (this.settings.showParticipatingOnly) {
                        url = url.concat('/participating');
                    }

                    show_uri(null, url, CURRENT_TIME);
                } catch (e) {
                    WidgetController.LOGGER.error('Cannot open uri', e);
                }
                break;
            case BUTTON_SECONDARY:
                openPrefs();
                break;
        }
    }

    private updateNotificationCount(notificationCount?: number): void {
        this.widget.text = `${notificationCount ?? '!'}`;
    }

    private settingChanged(setting: string): void {
        WidgetController.LOGGER.debug('Configuration property {0} is changed', setting);

        if (setting == 'hide-notification-count') {
            this.updateButtonVisibility();
        }
    }

    private updateButtonVisibility(): void {
        this.widget.textVisible = !this.settings.hideNotificationCount;
    }
}
