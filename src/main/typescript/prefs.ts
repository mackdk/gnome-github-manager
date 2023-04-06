import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { PrefsStack } from '@github-manager/preferences';
import { initializeTranslations } from '@github-manager/utils';

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
};
