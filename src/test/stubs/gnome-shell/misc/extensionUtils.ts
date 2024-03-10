import Gio from '@girs/gio-2.0';

export class ExtensionMetadata {
    uuid: string = 'e1f0a5eb-a65b-4dff-a0c2-ba024ac7ea3a';
    name: string = 'TestSuite';
    description: string = 'Test Suite Extension Mock';
    'shell-version': string[] = ['1', '2', '3', '4', '5'];
    url: string = 'https://example.com/test/suite';
    version: number = 1;
    status: string = 'Beta';
    comment: string = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
}

export class Extension {
    metadata: ExtensionMetadata = new ExtensionMetadata();
    uuid: string = '8416fd2f-35af-429c-bfcf-eaaff3871644';
    type: number = 1;
    path: string = '/test';
    error: string = '';
    hasPrefs: boolean = true;
    hasUpdate: boolean = true;
    canChange: boolean = true;
    sessionModes: string[] = [];
}

export function initTranslations(domain: string): void {};

export function getCurrentExtension(): Extension {
    const ext = new Extension();
    ext.metadata.name = 'TestSuite';
    return ext;
};

export function openPrefs(): void {};

export function getSettings(name?: string): Gio.Settings {
    return new Gio.Settings();
};
