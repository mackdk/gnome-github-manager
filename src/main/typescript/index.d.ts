export {};

declare global {
    export const imports: {
        gi: {
            versions: {
                Adw: string;
                Soup: string;
            };
        };
    };

    export const log: (message) => void;
    export const logError: (e: Error | string | unknown, message: string) => void;
}

declare module '@gi-types/gobject2' {
    export interface MetaInfo {
        GTypeName: string;
        GTypeFlags?: TypeFlags;
        Implements?: { $gtype: GType }[];
        Properties?: Record<string, ParamSpec>;
        Signals?: Record<string, SignalDefinition>;
        Requires?: { $gtype: GType }[];
        CssName?: string;
        Template?: string;
        Children?: string[];
        InternalChildren?: string[];
    }
}
