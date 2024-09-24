import * as Config from '@girs/gnome-shell/dist/misc/config';

import { Logger } from '@github-manager/utils';

import { DefaultNotificationProvider } from './DefaultNotificationProvider';
import { LegacyNotificationProvider } from './LegacyNotificationProvider';
import { NotificationProvider } from './NotificationProvider';

const LOGGER: Logger = new Logger('notifications::NotificationProviderFactory');

export function getDefault(): NotificationProvider {
    const [major] = Config.PACKAGE_VERSION.split('.').map((s) => Number(s));
    if (major >= 46) {
        LOGGER.debug('Use GNOME 46+ Notification provider');
        return new DefaultNotificationProvider();
    }

    LOGGER.debug('Use legacy GNOME 45 Notification provider');
    return new LegacyNotificationProvider();
}
