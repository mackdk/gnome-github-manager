export {};

declare global {
    /* eslint-disable no-var -- Var is needed to add stuff to node global */
    export var imports: {
        gi: {
            versions: {
                Adw: string;
                Soup: string;
            };
        };
    };
    /* eslint-enable no-var */

    export function log(message: string): void;
    export function logError(e: unknown, message: string): void;
}
