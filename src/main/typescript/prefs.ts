import { PrefsStack } from '@github-manager/ui/prefs';

export default {
    init: function () {
        // Nothing to initialize
    },

    buildPrefsWidget: function () {
        try {
            return new PrefsStack();
        } catch (err) {
            logError(err, '[Github Manager Extension] [buildPrefsWidget] Unable to build widget');
            return null;
        }
    },
};
