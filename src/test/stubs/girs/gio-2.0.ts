import GObject from "./gobject-2.0";

export namespace Gio {
    export class File {
        public static new_for_path(_path: string): File {
            return new File();
        }

        public query_exists(_cancellable: unknown): boolean {
            return false;
        }

        public load_contents(_cancellable: unknown): [boolean, Uint8Array, string | null] {
            return [false, new Uint8Array(), null];
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

    export class Icon {}

    export function icon_new_for_string(_str: string): Icon {
        return new Icon();
    }

    export interface AsyncResult extends GObject.Object {}

    export type AsyncReadyCallback<A = GObject.Object> = (source_object: A | null, res: AsyncResult, data?: any | null) => void;
}

export default Gio;
