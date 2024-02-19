export class MetaInfo {}

export function registerClass(_info: unknown, _klass: unknown = undefined): object {
    return _klass ?? _info as object;
}
