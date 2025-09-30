import { readFileSync } from 'fs';

import { ExtensionMetadata } from '@girs/gnome-shell/dist/types/extension-metadata';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript, { RollupTypescriptOptions } from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';

import { CodeAdapter } from './src/support/typescript/CodeAdapter';
import { shellExecute } from './src/support/typescript/RollupShellExecute';

const buildPath = 'build';
const distributionPath = `${buildPath}/dist`;
const cachePath = `${buildPath}/compile`;

const srcPath = 'src';
const mainSrcPath = `${srcPath}/main`;
const typescriptSourcesPath = `${mainSrcPath}/typescript`;
const resourcesPath = `${mainSrcPath}/resources`;

// Read the extension metadata
const data: string = readFileSync(`${resourcesPath}/metadata.json`, 'utf-8');
const metadata: ExtensionMetadata = JSON.parse(data) as ExtensionMetadata;

const explicitMappings = new Map<string, string>(
    Object.entries({
        '@girs/adw-1': 'gi://Adw',
        '@girs/clutter-17': 'gi://Clutter',
        '@girs/gdk-4.0': 'gi://Gdk',
        '@girs/gdkpixbuf-2.0': 'gi://GdkPixbuf',
        '@girs/gio-2.0': 'gi://Gio',
        '@girs/glib-2.0': 'gi://GLib',
        '@girs/gobject-2.0': 'gi://GObject',
        '@girs/gnomedesktop-4.0': 'gi://GnomeDesktop?version=4.0',
        '@girs/gtk-4.0': 'gi://Gtk',
        '@girs/soup-3.0': 'gi://Soup?version=3.0',
        '@girs/st-17': 'gi://St',
    })
);

function pathMapper(root: string, directMappings: Map<string, string>, id: string): string {
    const direct = directMappings.get(id);
    if (direct !== undefined) {
        return direct;
    }

    if (id.startsWith('@girs/gnome-shell')) {
        const path = id.substring(22);
        return `resource:///${root}/${path}.js`;
    }

    throw new Error(`Unable to map path ${id}`);
}

function isExternal(id: string): boolean {
    return id.startsWith('gi://') || id.startsWith('resource://') || id.startsWith('@girs/');
}

const adapter = new CodeAdapter();

const typescriptPluginOptions: RollupTypescriptOptions = {
    tsconfig: './tsconfig.json',
    noEmitOnError: true,
    outputToFilesystem: true,
    cacheDir: cachePath,
    transformers: {
        before: [adapter.beforeCompilation.bind(adapter)],
    },
};

export default defineConfig([
    {
        input: `${typescriptSourcesPath}/extension.ts`,
        treeshake: {
            moduleSideEffects: 'no-external',
        },
        output: {
            sourcemap: false,
            file: `${distributionPath}/extension.js`,
            format: 'esm',
            exports: 'default',
            paths: (id) => pathMapper('org/gnome/shell', explicitMappings, id),
            assetFileNames: '[name][extname]',
        },
        external: (id) => isExternal(id),
        plugins: [
            nodeResolve({
                preferBuiltins: false,
            }),
            typescript(typescriptPluginOptions),
            shellExecute({
                // Create distribuition dir, if not present
                'create-dist': `mkdir -p ${distributionPath}`,
                // Copy resources to distribution dir
                'copy-resources': `cp -R ${resourcesPath}/* ${distributionPath}`,
                // Replace the translation domain in the UI files
                'replace-translation-domain': `sed -i 's/{{uuid}}/${metadata.uuid}/' ${distributionPath}/ui/*.ui`,
                // Compile the schema
                'compile-schema': `glib-compile-schemas ${resourcesPath}/schemas/ --targetdir=${distributionPath}/schemas/`,
                // Compile the po files and place them in the correct directory
                // prettier-ignore
                'compile-translations': `find ${mainSrcPath}/po/ -name "*.po" -exec basename -s .po {} \\; ` +
                    '| xargs -I{} echo "' +
                        `mkdir -p ${distributionPath}/locale/{}/LC_MESSAGES; ` +
                        `msgfmt -o ${distributionPath}/locale/{}/LC_MESSAGES/${metadata.uuid}.mo ${mainSrcPath}/po/{}.po` +
                    '" ' +
                    '| sh',
                // Generate extension-info.json
                // prettier-ignore
                'generate-extension-info': 'jq ' +
                    // Translators are extract from the PO files
                    '--argjson translators "$(' +
                        'jq -Rscf ./src/support/jq/po-header-to-json.jq src/main/po/*.po' +
                    ')" ' +
                    // Authors are extract from the git shortlog, considering only the commits after the fork
                    '--argjson authors "$(' +
                        'git shortlog -sn gnome-github-notifications..HEAD | jq -Rscf src/support/jq/shortlog-to-authors.jq' +
                    ')" ' +
                    // Original authors are extract from the git shortlog, considering only the commits BEFORE the fork
                    '--argjson originalAuthors "$(' +
                        'git shortlog -sn gnome-github-notifications | jq -Rscf src/support/jq/shortlog-to-authors.jq' +
                    ')" ' +
                    // Changelog data
                    '--argjson changelog "$(yq eval -o json changelog.yaml)" ' +
                    // Just to keep consistent indentation with other JSON files
                    '--indent 4 ' +
                    // Combine everything together
                    '--from-file ./src/support/jq/package-to-extension-info.jq ' +
                    'package.json ' +
                    `> ${distributionPath}/extension-info.json`,
            }),
        ],
    },
    {
        input: `${typescriptSourcesPath}/prefs.ts`,
        output: {
            sourcemap: false,
            file: `${distributionPath}/prefs.js`,
            format: 'esm',
            exports: 'default',
            name: 'prefs',
            paths: (id) => pathMapper('org/gnome/Shell/Extensions/js', explicitMappings, id),
        },
        treeshake: {
            moduleSideEffects: 'no-external',
        },
        external: (id) => isExternal(id),
        plugins: [
            nodeResolve({
                preferBuiltins: false,
            }),
            typescript(typescriptPluginOptions),
        ],
    },
]);
