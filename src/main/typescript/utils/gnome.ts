import GObject from '@girs/gobject-2.0';

import { Logger } from './Logger';

export type GObjectMetaInfo = GObject.MetaInfo<
    Record<string, GObject.ParamSpec>,
    { $gtype: GObject.GType }[],
    Record<string, GObject.SignalDefinition>
>;

const LOGGER: Logger = new Logger('utils::GUtils');

interface BaseGObject<K extends GObject.Object> {
    metaInfo?: GObjectMetaInfo;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any --
     * any is required here as a GObject can have any kind of constructor
     */
    new (...args: any[]): K;
}

// Taken from https://github.com/material-shell/material-shell/blob/main/src/utils/gjs.ts
/// Decorator function to call `GObject.registerClass` with the given class.
/// Use like
/// ```
/// @RegisterGObjectClass
/// export class MyThing extends GObject.Object { ... }
/// ```
export function registerGObject<K extends GObject.Object, T extends BaseGObject<K>>(target: T): T {
    // Note that we use 'hasOwnProperty' because otherwise we would get inherited meta infos.
    // This would be bad because we would inherit the GObjectName too, which is supposed to be unique.
    if (target.metaInfo !== undefined && Object.hasOwn(target, 'metaInfo')) {
        LOGGER.debug('Registering GObject {0} with metaInfo', typeof target);
        return GObject.registerClass(target.metaInfo, target);
    } else {
        LOGGER.debug('Registering GObject {0} as standalone', typeof target);
        return GObject.registerClass(target);
    }
}
