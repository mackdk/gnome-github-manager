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
