export interface TranslationDomain {
    gettext(msgId: string): string;
    ngettext(singularMsgId: string, pluralMsgId: string, n: number): string;
    pgettext(context: string | null, msgId: string): string;
}

export function domain(doman: string): TranslationDomain;
