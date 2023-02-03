import { Settings } from '@gi-types/gio2';

export interface ExtensionMetadata {
    uuid: string,
    name: string,
    description: string,
    'shell-version': Array<string>,
    url: string,
    version: number
}

export interface Extension {
    metadata: ExtensionMetadata
    path: string;
}

export function openPrefs(): void;
export function getCurrentExtension(): Extension;
export function getSettings(name?: string): Settings;
