import { GitHub } from '@github-manager/client';
import { Logger } from '@github-manager/utils';
import { _ } from '@github-manager/utils/locale';

import { NotificationAction } from './NotificationAction';

export class DismissAction implements NotificationAction {
    private static readonly LOGGER: Logger = new Logger('notifications::actions::DismissAction');

    public get label(): string {
        return _('Dismiss');
    }

    public execute(notification?: GitHub.Thread): void {
        // Nothing to do, just logging if enabled
        if (!DismissAction.LOGGER.isDebugEnabled()) {
            return;
        }

        if (notification !== undefined) {
            DismissAction.LOGGER.debug('Dismissing notification {0}', notification.id);
        } else {
            DismissAction.LOGGER.debug(`Dismissing all notifications`);
        }
    }
}
