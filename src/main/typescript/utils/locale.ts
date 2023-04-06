import { TranslationDomain, domain } from '@gettext';
import { initTranslations } from '@gnome-shell/misc/extensionUtils';

let translationDomain: TranslationDomain | undefined;

export type FormatParameter = number | string | bigint | symbol;

export function initializeTranslations(extensionDomain: string): void {
    initTranslations(extensionDomain);

    translationDomain = domain(extensionDomain);
}

export function _(msgId: string, ...args: FormatParameter[]): string {
    if (translationDomain === undefined) {
        throw new Error('Translation domain is not initialized. Call initializeTranslations() first.');
    }

    const translated = translationDomain.gettext(msgId);
    if (args.length > 0) {
        return translated.replace(/{(\d+)}/g, (match: string, number: number) => args[number]?.toString() ?? match);
    }

    return translated;
}

export function ngettext(singularMsgId: string, pluralMsgId: string, n: number, ...args: FormatParameter[]): string {
    if (translationDomain === undefined) {
        throw new Error('Translation domain is not initialize. Call initializeTranslations() first');
    }

    const translated = translationDomain.ngettext(singularMsgId, pluralMsgId, n);
    if (args.length > 0) {
        return translated.replace(/{(\d+)}/g, (match: string, number: number) => args[number]?.toString() ?? match);
    }

    return translated;
}
