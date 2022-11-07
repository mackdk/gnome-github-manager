import { Object } from '@gi-types/gobject2';
import { BoxLayout } from '@gi-types/clutter10';
import { Icon, Settings, ThemedIcon } from '@gi-types/gio2';
import { Widget } from '@gi-types/st1';
import { DateTime } from '@gi-types/glib2';

export { };

declare global {
    export const imports: {
        mainloop: MainLoop;
        ui: {
            main: Main;
            messageTray: MessageTray;
            panelMenu: PanelMenu;
        };
        misc: {
            extensionUtils: ExtensionUtils;
        }
    };

    export interface ExtensionMetadata {
        uuid: string,
        name: string,
        description: string,
        'shell-version': Array<string>,
        url: string,
        version: number
    }

    export interface Extension {
        metadata: ExtensionMetadata
        path: string;
    }

    export interface ExtensionUtils {
        openPrefs(): void;
        getCurrentExtension(): Extension;
        getSettings(name: string): Settings;
    }

    export namespace PanelMenu {
        export class ButtonBox extends Widget { }

        export class Button extends ButtonBox {
            constructor(menuAlignment: number, nameText: string, dontCreateMenu: boolean);
            add_actor(widget: Widget): void;
        }
    }

    export interface PanelMenu {
        Button: PanelMenu.Button;
    }

    export interface RightBox extends BoxLayout {
        insert_child_at_index(widget: Widget, index: number): void;
        remove_child(widgt: Widget): void;
    }

    export interface Panel extends Widget {
        _rightBox: RightBox;

        addToStatusArea(role: string, indicator: PanelMenu.Button, position?: number, box?: number): PanelMenu.Button;
    }

    export namespace MessageTray {

        export interface NotificationProperties {
            gicon: Icon,
            secondaryGIcon: Icon,
            bannerMarkup: boolean,
            clear: boolean,
            datetime: DateTime,
            soundName: string,
            soundFile: string,
        }

        export class Notification extends Object {
            constructor(notificationSource: SystemNotificationSource, title: string, banner: string, params: Partial<NotificationProperties>);
            setTransient(state: boolean): void;
            update(title: string, message: string, properties: Partial<NotificationProperties>): void;
        }

        export class Source extends Object {
            notifications: Notification[];

            constructor(title: string, iconName: string);
            getIcon(): ThemedIcon;
        }

        export class SystemNotificationSource extends Source {
            constructor();
            showNotification(notification: Notification): void;
        }
    }

    export interface MessageTray {
        SystemNotificationSource: typeof MessageTray.SystemNotificationSource;

        Notification: typeof MessageTray.Notification;

        add(notificationSource: MessageTray.SystemNotificationSource): void;
    }

    interface MainLoop {
        timeout_add_seconds(number: number, callback: () => boolean): number;
        source_remove(id: number): void;
    }

    export interface Main {
        panel: Panel;
        messageTray: MessageTray;
    }

    export const log: (message: string) => void;
    export const logError: (e: Error, message: string) => void;
}
