import Adw from '@girs/adw-1';
import { ExtensionPreferences } from '@girs/gnome-shell/dist/extensions/prefs';
import { ExtensionMetadata } from '@girs/gnome-shell/dist/types';
import GObject from '@girs/gobject-2.0';
import Gtk from '@girs/gtk-4.0';

import { PreferencesController } from '@github-manager/preferences';
import { Logger } from '@github-manager/utils';

export default class GithubManagerPreferences extends ExtensionPreferences {
    public constructor(metadata: ExtensionMetadata) {
        super(metadata);

        Logger.initialize(metadata.name);
    }

    public fillPreferencesWindow(window: Adw.PreferencesWindow): void {
        const builder = new Gtk.Builder();
        builder.set_translation_domain(`${this.metadata.uuid}`);
        builder.add_from_file(`${this.path}/ui/AdwPreferences.ui`);

        const generalPage: Adw.PreferencesPage = this.buildObject(builder, 'general');
        const notificationsPage: Adw.PreferencesPage = this.buildObject(builder, 'notifications');

        window.add(generalPage);
        window.add(notificationsPage);

        window.insert_action_group(
            'actions',
            PreferencesController.buildActionGroupFor(window, this.metadata, this.getSettings())
        );

        const gtkStack = generalPage.get_parent()?.get_parent()?.get_parent();
        const header = gtkStack?.get_next_sibling()?.get_first_child()?.get_first_child()?.get_first_child();
        if (header === undefined || header === null) {
            throw new Error('Unable to find the Header bar to add the menu');
        }

        const buttonLayout = this.getSettings('org.gnome.desktop.wm.preferences').get_string('button-layout');
        PreferencesController.addMenuButton(
            header as Gtk.HeaderBar,
            this.buildObject(builder, 'primaryMenu'),
            buttonLayout
        );
    }

    private buildObject<Type extends GObject.Object>(builder: Gtk.Builder, pageName: string): Type {
        const obj: GObject.Object | null = builder.get_object(pageName);
        if (obj === null) {
            throw new Error('Unable to build preferences page ' + pageName);
        }

        return obj as Type;
    }
}
