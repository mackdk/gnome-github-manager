export class File {
    public static new_for_path(_path: string): File {
        return new File();
    }

    public query_exists(_cancellable: unknown): boolean {
        return false;
    }

    public load_contents(_cancellable: unknown): [boolean, Uint8Array] {
        return [false, new Uint8Array()];
    }
}

export type SettingsCallback = (_source: Settings, key: string) => void;

export class Settings {
    private callback?: SettingsCallback;

    public connect(signal: string, callback: SettingsCallback): number {
        if (signal === 'changed') {
            this.callback = callback;
        }
        return 0;
    }

    public disconnect(_id: number): void {}

    public get_string(_key: string): string {
        return `value`;
    }

    public get_boolean(_key: string): boolean {
        return true;
    }

    public get_int(_key: string): number {
        return 1;
    }

    public emit(signal: string, key: string): void {
        if (signal === 'changed' && this.callback !== undefined) {
            this.callback(this, key);
        }
    }
}

export class IconPrototype {
    public constructor() {}
}
export class Icon extends IconPrototype {
    public constructor() {
        super();
    }
}

export function icon_new_for_string(_str: string): Icon {
    return new Icon();
}
