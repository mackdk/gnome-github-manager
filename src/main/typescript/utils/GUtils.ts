import { MetaInfo, registerClass } from '@gi-types/gobject2';

import { Logger } from './Logger';

const LOGGER: Logger = new Logger('utils::GUtils');

interface BaseGObject<K extends object> {
    metaInfo?: MetaInfo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (...params: any[]): K;
}

// Taken from https://github.com/material-shell/material-shell/blob/main/src/utils/gjs.ts
/// Decorator function to call `GObject.registerClass` with the given class.
/// Use like
/// ```
/// @RegisterGObjectClass
/// export class MyThing extends GObject.Object { ... }
/// ```
export function registerGObject<K extends object, T extends BaseGObject<K>>(target: T): T {
    // Note that we use 'hasOwnProperty' because otherwise we would get inherited meta infos.
    // This would be bad because we would inherit the GObjectName too, which is supposed to be unique.
    if (target.metaInfo && Object.prototype.hasOwnProperty.call(target, 'metaInfo')) {
        LOGGER.debug('Registering GObject {0} with metaInfo', typeof target);
        return registerClass(target.metaInfo, target) as unknown as typeof target;
    } else {
        LOGGER.debug('Registering GObject {0} as standalone', typeof target);
        return registerClass(target) as unknown as typeof target;
    }
}
