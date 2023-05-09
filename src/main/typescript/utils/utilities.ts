export function lazy<T>(_target: T, _name: string): void {
    // This is only used before compilation by a trasformer. Nothing to do.
}

export function formatString(template: string, ...args: unknown[]): string {
    if (args.length === 0) {
        return template;
    }

    return template.replace(/{(\d+)}/g, (match: string, number: number) => args[number]?.toString() ?? match);
}

export function removeAfter(text: string, gate: string): string {
    if (!text.includes(gate)) {
        return text;
    }

    return text.substring(0, text.indexOf(gate));
}

class ReadonlyMapWrapper<K, V> implements ReadonlyMap<K, V> {
    private readonly wrappedMap: Map<K, V>;

    public constructor(map: Map<K, V>) {
        this.wrappedMap = map;
    }

    public entries(): IterableIterator<[K, V]> {
        return this.wrappedMap.entries();
    }

    public forEach(callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void, thisArg?: unknown): void {
        return this.wrappedMap.forEach((v, k, _map) => callbackfn(v, k, this), thisArg);
    }

    public get(key: K): V | undefined {
        return this.wrappedMap.get(key);
    }

    public has(key: K): boolean {
        return this.wrappedMap.has(key);
    }

    public keys(): IterableIterator<K> {
        return this.wrappedMap.keys();
    }

    public get size(): number {
        return this.wrappedMap.size;
    }

    public values(): IterableIterator<V> {
        return this.wrappedMap.values();
    }

    public [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.wrappedMap[Symbol.iterator]();
    }
}

export function readonlyMap<K, V>(value: Map<K, V>): ReadonlyMap<K, V> {
    return Object.freeze(new ReadonlyMapWrapper(value));
}
