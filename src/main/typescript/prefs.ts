import { PreferencesPage, PreferencesWindow } from '@gi-types/adw1';
import { Builder, HeaderBar } from '@gi-types/gtk4';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { PreferencesController, PrefsStack } from '@github-manager/preferences';
import { initializeTranslations } from '@github-manager/utils/locale';

export default {
    init: () => {
        initializeTranslations(`${getCurrentExtension().metadata.uuid}`);
    },

    buildPrefsWidget: () => {
        try {
            return new PrefsStack();
        } catch (err) {
            logError(err, '[Github Manager Extension] [buildPrefsWidget] Unable to build widget');
            return null;
        }
    },

    fillPreferencesWindow: (window: PreferencesWindow) => {
        const builder = new Builder();
        builder.set_translation_domain(`${getCurrentExtension().metadata.uuid}`);
        builder.add_from_file(`${getCurrentExtension().path}/ui/AdwPreferences.ui`);

        const generalPage: PreferencesPage = builder.get_object('general');
        const notificationsPage: PreferencesPage = builder.get_object('notifications');

        window.add(generalPage);
        window.add(notificationsPage);

        window.insert_action_group('actions', PreferencesController.buildActionGroupFor(window));

        const header = generalPage
            .get_parent() // AdwViewStack
            ?.get_parent()
            ?.get_parent() // GtkStack
            ?.get_parent() // GtkBox
            ?.get_first_child() as HeaderBar;

        PreferencesController.addMenuButton(header, builder.get_object('primaryMenu'));
    },
};
