
export { };

declare global {
    export const imports: {
        gi: {
            versions: {
                Soup: string;
            };
        };
    };

    export const log: (message: string) => void;
    export const logError: (e: Error, message: string) => void;
}
