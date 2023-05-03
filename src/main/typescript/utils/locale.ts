import { TranslationDomain, domain } from '@gettext';
import { initTranslations } from '@gnome-shell/misc/extensionUtils';

let translationDomain: TranslationDomain | undefined;

export type FormatParameter = number | string | bigint | symbol | object | unknown;

export function initializeTranslations(extensionDomain: string): void {
    initTranslations(extensionDomain);

    translationDomain = domain(extensionDomain);
}

export function disposeTranslationDomain(): void {
    translationDomain = undefined;
}

export function _(msgId: string, ...args: FormatParameter[]): string {
    if (translationDomain === undefined) {
        throw new Error('Translation domain is not initialized. Call initializeTranslations() first.');
    }

    const translated = translationDomain.gettext(msgId);
    return format(translated, args);
}

export function ngettext(singularMsgId: string, pluralMsgId: string, n: number, ...args: FormatParameter[]): string {
    if (translationDomain === undefined) {
        throw new Error('Translation domain is not initialized. Call initializeTranslations() first.');
    }

    const translated = translationDomain.ngettext(singularMsgId, pluralMsgId, n);
    return format(translated, args);
}

function format(template: string, args: FormatParameter[]): string {
    if (args.length === 0) {
        return template;
    }

    return template.replace(/{(\d+)}/g, (match: string, number: number) => args[number]?.toString() ?? match);
}
