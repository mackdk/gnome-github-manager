
export { };

declare global {
    export const imports: {
        gi: {
            GObject: any,
            versions: {
                Soup: string;
            };
        };
    };

    export const log: (message: string) => void;
    export const logError: (e: Error | string | unknown, message: string) => void;
}

declare module '@gi-types/gobject2' {
    export interface MetaInfo {
        GTypeName: string;
        GTypeFlags?: TypeFlags;
        Implements?: { $gtype: GType }[];
        Properties?: { [K: string]: ParamSpec };
        Signals?: { [K: string]: SignalDefinition };
        Requires?: { $gtype: GType }[];
        CssName?: string;
        Template?: string;
        Children?: string[];
        InternalChildren?: string[];
    }
}
