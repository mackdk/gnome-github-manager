import { TranslationDomain, domain } from '@gettext';
import { initTranslations } from '@gnome-shell/misc/extensionUtils';

import { formatString } from './utilities';

let translationDomain: TranslationDomain | undefined;

export function initializeTranslations(extensionDomain: string): void {
    initTranslations(extensionDomain);

    translationDomain = domain(extensionDomain);
}

export function disposeTranslationDomain(): void {
    translationDomain = undefined;
}

export function _(msgId: string, ...args: unknown[]): string {
    if (translationDomain === undefined) {
        throw new Error('Translation domain is not initialized. Call initializeTranslations() first.');
    }

    const translated = translationDomain.gettext(msgId);
    return formatString(translated, ...args);
}

export function ngettext(singularMsgId: string, pluralMsgId: string, n: number, ...args: unknown[]): string {
    if (translationDomain === undefined) {
        throw new Error('Translation domain is not initialized. Call initializeTranslations() first.');
    }

    const translated = translationDomain.ngettext(singularMsgId, pluralMsgId, n);
    return formatString(translated, ...args);
}
