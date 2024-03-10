export namespace GObject {
    class GnomeObject {};

    export type Object = GnomeObject;

    export class ParamSpec {}

    export class SignalDefinition {}

    export class MetaInfo<Props, Interfaces, Sigs> {}

    export type GType<T = unknown> = {
        __type__(arg: never): T
        name: string
    }

    export function registerClass(_info: unknown, _klass: unknown = undefined): object {
        return _klass ?? (_info as object);
    }
}

export default GObject;
