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
        '@girs/clutter-15': 'gi://Clutter',
        '@girs/gdk-4.0': 'gi://Gdk',
        '@girs/gdkpixbuf-2.0': 'gi://GdkPixbuf',
        '@girs/gio-2.0': 'gi://Gio',
        '@girs/glib-2.0': 'gi://GLib',
        '@girs/gobject-2.0': 'gi://GObject',
        '@girs/gtk-4.0': 'gi://Gtk',
        '@girs/soup-3.0': 'gi://Soup?version=3.0',
        '@girs/st-15': 'gi://St',
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

// prettier-ignore
// JQ template to convert a property file to a json
const jqPropertiesToJson =
    // Start by splitting every line
    'split("\\n")' +
        // Discard empty lines
        '| map(select(length > 0)) ' +
        // Discards comments
        '| map(select(startswith("#") | not)) ' +
        // Split on equals to divide the key from value
        '| map(split("=")) ' +
        // map to the json object
        '| map({' +
            // convert property key to json field removing initial and final spaces
            '(.[0] | gsub("(^\\\\s+|\\\\s+$)"; "")): ' +
            // convert property value to json value, splitting comma separated values into an array and removing spaces
            '.[1] | tostring | gsub("(^\\\\s+|\\\\s+$)"; "") | gsub("\\\\s+"; " ") | gsub(",\\\\s+"; ",") | split(",")' +
          '}) ' +
        // add the new entry
        '| add';

// JQ template to convert from package.json to extension-info.json adding the translators
const jqPackageToExtensionInfo = '{("version"): .version, ("authors"): [.author, .contributors[]]} + {$translators}';

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
                    '--argjson translators "$(' +
                        `sed -nr 's/.*(Project-Id-Version|Language-Team): ([^\\"]+).*$/\\2/p' src/main/po/*.po ` +
                            '| paste -d "=" - - ' +
                            `| jq -R -s '${jqPropertiesToJson}'` +
                    ')" ' +
                    '--indent 4 ' +
                    `'${jqPackageToExtensionInfo}' ` +
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
