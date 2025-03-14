import Adw from '@girs/adw-1';
import Gdk from '@girs/gdk-4.0';
import Gio from '@girs/gio-2.0';
import { gettext as _ } from '@girs/gnome-shell/dist/extensions/prefs';
import { ExtensionMetadata } from '@girs/gnome-shell/dist/types';
import GnomeDesktop from '@girs/gnomedesktop-4.0';
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

interface ChangelogEntry {
    released: string | null;
    changes: string[];
}

interface ExtensionInfo {
    version: string;
    authors: string[];
    originalAuthors: string[];
    translators: Record<string, string[]>;
    changelog: Record<string, ChangelogEntry>;
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
        const baseUrl = metadata.url;
        if (baseUrl === undefined) {
            throw new Error('Unable to identify the extension url');
        }

        const extensionInfo = getAdditionalExtensionInfo(`${metadata.path}/extension-info.json`);

        const iconTheme = Gtk.IconTheme.get_for_display(dialog.get_display());
        const originalSearchPath = iconTheme.get_search_path();

        // Adding the extension path to the icon theme directory, so that icons can be retrieved by name
        iconTheme.add_search_path(metadata.path);

        const aboutDialog = new Adw.AboutWindow({
            transientFor: dialog,
            modal: true,
            applicationName: metadata.name,
            applicationIcon: 'gnome-github-manager',
            developerName: 'Thomas Florio aka mackdk',
            version: extensionInfo.version,
            comments: _(
                'Integrate GitHub within the GNOME Desktop Environment.\n\n' +
                    'Based on GitHub Notifications by Alexandre Dufournet.'
            ),
            licenseType: Gtk.License.GPL_2_0,
            supportUrl: `${baseUrl}/discussions`,
            issueUrl: `${baseUrl}/issues/new`,
            copyright: '© 2022-2025 Thomas Florio',
            website: baseUrl,
        });

        aboutDialog.add_link(_('User Guide'), `${baseUrl}/wiki/User-guide`);
        aboutDialog.add_credit_section(_('GitHub Manager contributors'), extensionInfo.authors);
        aboutDialog.add_credit_section(_('GitHub Notifications contributors'), extensionInfo.originalAuthors);

        // Add a section for each translated language
        Object.entries(extensionInfo.translators).forEach(([languageCode, translators]: [string, string[]]): void => {
            const language = getLocaleDisplayName(languageCode);
            const sectionTitle = formatString(_('Translation to {0}'), language);
            aboutDialog.add_credit_section(sectionTitle, translators);
        });

        // Handle the changelog
        const releaseNotes = Object.entries(extensionInfo.changelog)
            .map(([version, entry]: [string, ChangelogEntry]): string => {
                return (
                    `<p>${getReleaseDescription(version, entry.released)}</p>` +
                    `<ul>${getChangesAsListItems(entry.changes)}</ul>`
                );
            })
            .join('');
        const majorVersion = extensionInfo.version.substring(0, extensionInfo.version.indexOf('.'));

        aboutDialog.set_release_notes(releaseNotes);
        aboutDialog.set_release_notes_version(majorVersion);

        aboutDialog.connect('close-request', () => {
            // Cleanup the search path
            iconTheme.set_search_path(originalSearchPath);
            return false;
        });
        aboutDialog.present();
    } catch (err) {
        LOGGER.error('Unable to open about dialog', err);
    }
}

function getReleaseDescription(version: string, releasedDate: string | null): string {
    if (releasedDate === null) {
        return formatString(_('Version {0} (development)'), version);
    }

    // Localize in the current locale
    const formattedDate = new Date(releasedDate).toLocaleDateString(undefined, { dateStyle: 'long' });
    return formatString(_('Version {0} released on {1}'), version, formattedDate);
}

function getChangesAsListItems(changes: string[]): string {
    return changes.map((e) => `<li>${e}</li>`).join('');
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

function getLocaleDisplayName(localeCode: string): string {
    // Use Gnome utility to get the localized locale name
    const result = GnomeDesktop.get_language_from_locale(localeCode, null);
    // Remove the encoding part if present
    return result.replace(/\[[^[\]]*\]$/, '').trim();
}
