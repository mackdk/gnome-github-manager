import { PrefsStack } from '@github-manager/ui/prefs';

export default {
    init: () => {
        // Nothing to initialize
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
