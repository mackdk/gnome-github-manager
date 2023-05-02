import { readFileSync } from 'fs';

import { ExtensionMetadata } from '@gnome-shell/misc/extensionUtils';
import commonjs from '@rollup/plugin-commonjs';
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

const globals = {
    // Dirty hack to make class that require Adwaita to work even in Gnome < 42
    '@gi-types/adw1': 'imports.gi.versions.Adw ? imports.gi.Adw : { ActionRow: imports.gi.Gtk.Widget }',
    '@gi-types/clutter10': 'imports.gi.Clutter',
    '@gi-types/gdk4': 'imports.gi.Gdk',
    '@gi-types/gdkpixbuf2': 'imports.gi.GdkPixbuf',
    '@gi-types/gio2': 'imports.gi.Gio',
    '@gi-types/glib2': 'imports.gi.GLib',
    '@gi-types/gobject2': 'imports.gi.GObject',
    '@gi-types/gtk4': 'imports.gi.Gtk',
    '@gi-types/soup2': 'imports.gi.Soup',
    '@gi-types/soup3': 'imports.gi.Soup',
    '@gi-types/st1': 'imports.gi.St',
    '@gnome-shell/misc/extensionUtils': 'imports.misc.extensionUtils',
    '@gnome-shell/ui': 'imports.ui',
    '@gnome-shell/ui/panel': 'imports.ui.panel',
    '@gnome-shell/ui/panelMenu': 'imports.ui.panelMenu',
    '@gnome-shell/ui/messageTray': 'imports.ui.messageTray',
    '@gettext': 'imports.gettext',
};

const external = Object.keys(globals);

const adapter = new CodeAdapter();

const typescriptPluginOptions: RollupTypescriptOptions = {
    tsconfig: './tsconfig.json',
    noEmitOnError: true,
    outputToFilesystem: true,
    cacheDir: cachePath,
    transformers: {
        before: [adapter.beforeCompilation.bind(adapter)],
        after: [adapter.afterCompilation.bind(adapter)],
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
            format: 'iife',
            name: 'init',
            banner: ['try {'].join('\n'),
            footer: [
                '}',
                'catch(err) {',
                "  logError(err, '[Github Manager Extension] [init] Unxpected error');",
                '  throw err;',
                '}',
            ].join('\n'),
            exports: 'default',
            globals,
            assetFileNames: '[name][extname]',
        },
        external,
        plugins: [
            commonjs(),
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
            format: 'iife',
            exports: 'default',
            name: 'prefs',
            globals,
            banner: ["imports.gi.versions.Gtk = '4.0';"].join('\n'),
            footer: [
                'var init = prefs.init;',
                'var buildPrefsWidget = prefs.buildPrefsWidget;',
                'var fillPreferencesWindow = prefs.fillPreferencesWindow;',
            ].join('\n'),
        },
        treeshake: {
            moduleSideEffects: 'no-external',
        },
        external,
        plugins: [
            commonjs(),
            nodeResolve({
                preferBuiltins: false,
            }),
            typescript(typescriptPluginOptions),
        ],
    },
]);
