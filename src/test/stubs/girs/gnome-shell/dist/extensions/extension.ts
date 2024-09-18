export function gettext(text: string): string {
    return text;
}

export function ngettext(singularMsgId: string, pluralMsgId: string, n: number): string {
    return n === 1 ? singularMsgId : pluralMsgId;
}

export function pgettext(context: string | null, msgId: string): string {
    return msgId;
}
