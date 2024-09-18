import Gdk from '@girs/gdk-4.0';
import Pixbuf from '@girs/gdkpixbuf-2.0';
import Gio from '@girs/gio-2.0';
import { gettext as _ } from '@girs/gnome-shell/dist/extensions/prefs';
import { ExtensionMetadata } from '@girs/gnome-shell/dist/types';
import Gtk from '@girs/gtk-4.0';

import { Logger, formatString } from '@github-manager/utils';

const LOGGER = new Logger('preferences::NotificationController');

interface SpinButtonParameters {
    min: number;
    max: number;
    step: number;
}

interface DropDownParameters {
    items: string[];
}

interface ExtensionInfo {
    version: string;
    authors: string[];
    translators: Record<string, string[]>;
}

export function createAndBindWidget(
    widgetType: string,
    widgetParameters: string,
    settings?: Gio.Settings,
    settingKey?: string
): Gtk.Widget {
    let widget: Gtk.Widget, bindProperty: string;
    if (widgetType === 'GtkPasswordEntry') {
        widget = new Gtk.PasswordEntry({ showPeekIcon: true });
        bindProperty = 'text';
    } else if (widgetType === 'GtkSwitch') {
        widget = new Gtk.Switch({ halign: Gtk.Align.END });
        bindProperty = 'state';
    } else if (widgetType === 'GtkSpinButton') {
        const params = JSON.parse(widgetParameters) as Partial<SpinButtonParameters>;
        widget = Gtk.SpinButton.new_with_range(params.min ?? 0, params.max ?? 100, params.step ?? 1);
        bindProperty = 'value';
    } else if (widgetType === 'GtkDropDown') {
        const params = JSON.parse(widgetParameters) as Partial<DropDownParameters>;
        widget = new Gtk.DropDown({ model: Gtk.StringList.new(params.items ?? []) });

        bindProperty = 'selected';
    } else {
        widget = new Gtk.Entry();
        bindProperty = 'text';
    }

    // Align the widget
    widget.set_valign(Gtk.Align.CENTER);
    widget.set_hexpand(true);
    widget.set_vexpand(false);

    if (settings !== undefined && settingKey !== undefined && settingKey !== '') {
        settings.bind(settingKey, widget, bindProperty, Gio.SettingsBindFlags.DEFAULT);
    }

    return widget;
}

export function buildActionGroupFor(
    dialog: Gtk.Window,
    metadata: ExtensionMetadata,
    settings: Gio.Settings
): Gio.ActionGroup {
    const actionGroup = new Gio.SimpleActionGroup();
    const baseUrl = metadata.url;
    if (baseUrl === undefined) {
        throw new Error('Unable to identify the extension url');
    }

    addActionToGroup(actionGroup, 'resetToDefault', () => resetToDefault(dialog, settings));
    addActionToGroup(actionGroup, 'reportBug', () => openUrl(`${baseUrl}/issues/new`, dialog));
    addActionToGroup(actionGroup, 'userGuide', () => openUrl(`${baseUrl}/wiki`, dialog));
    addActionToGroup(actionGroup, 'about', () => about(dialog, metadata));

    const description = encodeURIComponent(metadata.name.concat(' Token'));
    const tokenGenerationUrl = `https://github.com/settings/tokens/new?description=${description}`;
    addActionToGroup(actionGroup, 'generateToken', () => openUrl(tokenGenerationUrl, dialog));

    return actionGroup;
}

export function addMenuButton(header: Gtk.HeaderBar, menu: Gtk.Widget, buttonLayout: string | null): void {
    try {
        // Try to set the menu button according to the title bar setting
        if (buttonLayout === 'appmenu:close') {
            header.pack_start(menu);
        } else {
            header.pack_end(menu);
        }
    } catch (error) {
        // No luck... just set at the beginning
        header.pack_start(menu);
    }
}

function addActionToGroup(actionGroup: Gio.SimpleActionGroup, name: string, callback: () => void): void {
    const action = new Gio.SimpleAction({ name: name });
    action.connect('activate', callback);
    actionGroup.add_action(action);
}

function resetToDefault(dialog: Gtk.Window, settings: Gio.Settings): void {
    const confirmation: Gtk.MessageDialog = new Gtk.MessageDialog({
        transientFor: dialog,
        buttons: Gtk.ButtonsType.YES_NO,
        messageType: Gtk.MessageType.QUESTION,
        modal: true,
        destroyWithParent: true,
        text: _('Are you sure you want to reset all settings?'),
        secondaryText: _('All the customizations made will be lost. This operation cannot be undone.'),
    });

    confirmation.get_widget_for_response(Gtk.ResponseType.YES)?.add_css_class('destructive-action');
    confirmation.set_default_response(Gtk.ResponseType.NO);

    confirmation.connect('response', (_source: Gtk.MessageDialog, response: number) => {
        if (response === Gtk.ResponseType.YES) {
            settings.list_keys().forEach((key) => {
                const defaultValue = settings.get_default_value(key);
                if (defaultValue !== null) {
                    settings.set_value(key, defaultValue);
                }
            });
        }

        _source.destroy();
    });

    confirmation.present();
}

function about(dialog: Gtk.Window, metadata: ExtensionMetadata): void {
    try {
        const githubIcon = Pixbuf.Pixbuf.new_from_file_at_scale(`${metadata.path}/github.svg`, -1, 128, true);
        const paintableLogo = Gtk.Image.new_from_pixbuf(githubIcon).get_paintable();

        const extensionInfo = getAdditionalExtensionInfo(`${metadata.path}/extension-info.json`);
        const translatorsMap = new Map<string, string[]>(Object.entries(extensionInfo.translators));

        const aboutDialog = new Gtk.AboutDialog({
            transientFor: dialog,
            modal: true,
            authors: extensionInfo.authors,
            programName: metadata.name,
            version: formatString(_('Version {0} r{1}'), extensionInfo.version, metadata.version),
            comments: _(
                'Integrate GitHub within the GNOME Desktop Environment.\n\n' +
                    'Based on GitHub Notifications by Alexandre Dufournet.'
            ),
            translatorCredits: Array.from(translatorsMap.entries())
                .map(([lang, translators]) => `${lang}:\n\t${translators.join('\n\t')}`)
                .join('\n\n'),
            licenseType: Gtk.License.GPL_2_0,
            website: metadata.url,
            websiteLabel: _('Source code on GitHub'),
        });

        if (paintableLogo !== null) {
            aboutDialog.logo = paintableLogo;
        }

        aboutDialog.set_system_information(null);

        const titleBar = aboutDialog.get_titlebar();
        if (titleBar instanceof Gtk.HeaderBar) {
            titleBar.get_title_widget()?.set_visible(true);
        }

        aboutDialog.present();
    } catch (err) {
        LOGGER.error('Unable to open about dialog', err);
    }
}

function getAdditionalExtensionInfo(filename: string): ExtensionInfo {
    const [success, bytes] = Gio.File.new_for_path(filename).load_contents(null);
    if (!success) {
        throw new Error('Unable to correcly load extension-info.json');
    }

    return JSON.parse(new TextDecoder('utf-8').decode(bytes.buffer)) as ExtensionInfo;
}

function openUrl(url: string, dialog: Gtk.Window): void {
    Gtk.show_uri(dialog, url, Gdk.CURRENT_TIME);
}
