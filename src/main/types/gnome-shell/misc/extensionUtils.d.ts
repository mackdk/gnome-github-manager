import Gio from '@girs/gio-2.0';

export interface ExtensionMetadata {
    uuid: string;
    name: string;
    description: string;
    'shell-version': string[];
    url: string;
    version: number;
    status: string;
    comment: string;
}

export interface Extension {
    metadata: ExtensionMetadata;
    uuid: string;
    type: number;
    dir: Gio.File;
    path: string;
    error: string;
    hasPrefs: boolean;
    hasUpdate: boolean;
    canChange: boolean;
    sessionModes: string[];
}

export function initTranslations(domain: string): void;
export function openPrefs(): void;
export function getCurrentExtension(): Extension;
export function getSettings(name?: string): Gio.Settings;
