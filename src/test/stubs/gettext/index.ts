export class TranslationDomain {
    public gettext(msgId: string): string {
        return msgId;
    }

    public ngettext(singularMsgId: string, pluralMsgId: string, n: number): string {
        return n > 1 ? pluralMsgId : singularMsgId;
    }

    public pgettext(context: string | null, msgId: string): string {
        return msgId;
    }
}

export function domain(doman: string): TranslationDomain {
    return new TranslationDomain();
};
