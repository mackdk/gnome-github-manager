import { File, Settings } from '@gi-types/gio2';

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
    dir: File;
    path: string;
    error: string;
    hasPrefs: boolean;
    hasUpdate: boolean;
    canChange: boolean;
    sessionModes: string[];
}

export function openPrefs(): void;
export function getCurrentExtension(): Extension;
export function getSettings(name?: string): Settings;
