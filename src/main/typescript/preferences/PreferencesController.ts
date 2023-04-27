import { CURRENT_TIME } from '@gi-types/gdk4';
import { Pixbuf } from '@gi-types/gdkpixbuf2';
import { ActionGroup, File, Settings, SettingsBindFlags, SimpleAction, SimpleActionGroup } from '@gi-types/gio2';
import { free } from '@gi-types/glib2';
import {
    AboutDialog,
    Align,
    ButtonsType,
    DropDown,
    Entry,
    HeaderBar,
    Image,
    License,
    MessageDialog,
    MessageType,
    PasswordEntry,
    ResponseType,
    SpinButton,
    StringList,
    Switch,
    Widget,
    Window,
    show_uri,
} from '@gi-types/gtk4';
import { getCurrentExtension, getSettings } from '@gnome-shell/misc/extensionUtils';

import { Logger } from '@github-manager/utils';
import { _ } from '@github-manager/utils/locale';

const extension = getCurrentExtension();

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

export function createAndBindWidget(widgetType: string, _widgetParameters: string, settingKey?: string): Widget {
    let widget: Widget, bindProperty: string;
    if (widgetType === 'GtkPasswordEntry') {
        widget = new PasswordEntry({ showPeekIcon: true });
        bindProperty = 'text';
    } else if (widgetType === 'GtkSwitch') {
        widget = new Switch({ halign: Align.END });
        bindProperty = 'state';
    } else if (widgetType === 'GtkSpinButton') {
        const params = JSON.parse(_widgetParameters) as Partial<SpinButtonParameters>;
        widget = SpinButton.new_with_range(params.min ?? 0, params.max ?? 100, params.step ?? 1);
        bindProperty = 'value';
    } else if (widgetType === 'GtkDropDown') {
        const params = JSON.parse(_widgetParameters) as Partial<DropDownParameters>;
        widget = new DropDown({ model: StringList.new(params.items ?? []) });

        bindProperty = 'selected';
    } else {
        widget = new Entry();
        bindProperty = 'text';
    }

    // Align the widget
    widget.set_valign(Align.CENTER);
    widget.set_hexpand(true);
    widget.set_vexpand(false);

    if (settingKey !== undefined && settingKey !== '') {
        getSettings().bind(settingKey, widget, bindProperty, SettingsBindFlags.DEFAULT);
    }

    return widget;
}

export function buildActionGroupFor(dialog: Window): ActionGroup {
    const actionGroup = new SimpleActionGroup();
    const baseUrl = extension.metadata.url;

    addActionToGroup(actionGroup, 'resetToDefault', () => resetToDefault(dialog));
    addActionToGroup(actionGroup, 'reportBug', () => openUrl(`${baseUrl}/issues/new`, dialog));
    addActionToGroup(actionGroup, 'userGuide', () => openUrl(`${baseUrl}/wiki`, dialog));
    addActionToGroup(actionGroup, 'about', () => about(dialog));

    const description = encodeURIComponent(extension.metadata.name.concat(' Token'));
    const tokenGenerationUrl = `https://github.com/settings/tokens/new?description=${description}`;
    addActionToGroup(actionGroup, 'generateToken', () => openUrl(tokenGenerationUrl, dialog));

    return actionGroup;
}

export function addMenuButton(header: HeaderBar, menu: Widget): void {
    try {
        // Try to set the menu button according to the title bar setting
        const buttonLayout = getSettings('org.gnome.desktop.wm.preferences').get_string('button-layout');
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

function addActionToGroup(actionGroup: SimpleActionGroup, name: string, callback: () => void): void {
    const action = new SimpleAction({ name: name });
    action.connect('activate', callback);
    actionGroup.add_action(action);
}

function resetToDefault(dialog: Window): void {
    const confirmation: MessageDialog = new MessageDialog({
        transientFor: dialog,
        buttons: ButtonsType.YES_NO,
        messageType: MessageType.QUESTION,
        modal: true,
        destroy_with_parent: true,
        text: _('Are you sure you want to reset all settings?'),
        secondaryText: _('All the customizations made will be lost. This operation cannot be undone.'),
    });

    confirmation.get_widget_for_response(ResponseType.YES)?.add_css_class('destructive-action');
    confirmation.set_default_response(ResponseType.NO);

    confirmation.connect('response', (_source, response) => {
        if (response === ResponseType.YES) {
            const settings: Settings = getSettings();
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

function about(dialog: Window): void {
    try {
        const githubIcon = Pixbuf.new_from_file_at_scale(`${extension.path}/github.svg`, -1, 128, true);
        const paintableLogo = Image.new_from_pixbuf(githubIcon).get_paintable();

        const extensionInfo = getAdditionalExtensionInfo('extension-info.json');
        const translatorsMap = new Map<string, string[]>(Object.entries(extensionInfo.translators));

        const aboutDialog = new AboutDialog({
            transientFor: dialog,
            modal: true,
            authors: extensionInfo.authors,
            programName: extension.metadata.name,
            version: _('Version {0}', extensionInfo.version),
            comments: _(
                'Integrate GitHub within the GNOME Desktop Environment.\n\n' +
                    'Based on GitHub Notifications by Alexandre Dufournet.'
            ),
            translatorCredits: Array.from(translatorsMap.entries())
                .map(([lang, translators]) => `${lang}:\n\t${translators.join('\n\t')}`)
                .join('\n\n'),
            licenseType: License.GPL_2_0,
            website: extension.metadata.url,
            website_label: _('Source code on GitHub'),
        });

        if (paintableLogo !== null) {
            aboutDialog.logo = paintableLogo;
        }

        aboutDialog.set_system_information(null);

        const titleBar = aboutDialog.get_titlebar();
        if (titleBar instanceof HeaderBar) {
            titleBar.get_title_widget()?.set_visible(true);
        }

        aboutDialog.present();
    } catch (err) {
        LOGGER.error('Unable to open about dialog', err);
    }
}

function getAdditionalExtensionInfo(filename: string): ExtensionInfo {
    const [success, bytes] = File.new_for_path(`${extension.path}/${filename}`).load_contents(null);
    if (!success) {
        throw new Error('Unable to correcly load extension-info.json');
    }

    try {
        return JSON.parse(new TextDecoder('utf-8').decode(bytes.buffer)) as ExtensionInfo;
    } finally {
        free(bytes);
    }
}

function openUrl(url: string, dialog: Window): void {
    show_uri(dialog, url, CURRENT_TIME);
}
