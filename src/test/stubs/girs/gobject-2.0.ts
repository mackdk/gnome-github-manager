import GLib from "./glib-2.0";

export namespace GObject {
    export type Object = {};

    export type GType<T = unknown> = {
        __type__(arg: never): T
        name: string
    }

    export enum SignalFlags {
        RUN_FIRST,
        RUN_LAST,
        RUN_CLEANUP,
        NO_RECURSE,
        DETAILED,
        ACTION,
        NO_HOOKS,
        MUST_COLLECT,
        DEPRECATED,
        ACCUMULATOR_FIRST_RUN,
    }

    enum TypeFlags {
        NONE,
        ABSTRACT,
        VALUE_ABSTRACT,
        FINAL,
        DEPRECATED,
    }

    export interface SignalDefinition {
        flags?: SignalFlags;
        accumulator: number;
        return_type?: GType;
        param_types?: GType[];
    }

    export class ParamSpec {}

    export interface MetaInfo<Props, Interfaces, Sigs> {
        GTypeName?: string;
        GTypeFlags?: TypeFlags;
        Properties?: Props;
        Signals?: Sigs;
        Implements?: Interfaces;
        CssName?: string;
        Template?: Uint8Array | GLib.Bytes | string;
        Children?: string[];
        InternalChildren?: string[];
    }

    export function registerClass<T, Props, Interfaces, Sigs>(_info: MetaInfo<Props, Interfaces, Sigs> | T, _klass?: T): T {
        return _klass ?? (_info as T);
    }
}

export default GObject;
