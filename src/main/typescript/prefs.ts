import Adw from '@girs/adw-1';
import Gtk from '@girs/gtk-4.0';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { PreferencesController } from '@github-manager/preferences';
import { Logger } from '@github-manager/utils';
import { initializeTranslations } from '@github-manager/utils/locale';

export default {
    init: () => {
        initializeTranslations(`${getCurrentExtension().metadata.uuid}`);
        Logger.initialize();
    },

    fillPreferencesWindow: (window: Adw.PreferencesWindow) => {
        const builder = new Gtk.Builder();
        builder.set_translation_domain(`${getCurrentExtension().metadata.uuid}`);
        builder.add_from_file(`${getCurrentExtension().path}/ui/AdwPreferences.ui`);

        const generalPage: Adw.PreferencesPage = builder.get_object('general');
        const notificationsPage: Adw.PreferencesPage = builder.get_object('notifications');

        window.add(generalPage);
        window.add(notificationsPage);

        window.insert_action_group('actions', PreferencesController.buildActionGroupFor(window));

        const header = generalPage
            .get_parent() // AdwViewStack
            ?.get_parent()
            ?.get_parent() // GtkStack
            ?.get_parent() // GtkBox
            ?.get_first_child() as Gtk.HeaderBar;

        PreferencesController.addMenuButton(header, builder.get_object('primaryMenu'));
    },
};
