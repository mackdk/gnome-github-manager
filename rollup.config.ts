import { defineConfig } from 'rollup';

import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import execute from 'rollup-plugin-shell';

import GObjectAdapter from './src/support/typescript/GObjectAdapter';

const buildPath = 'build';

const globals = {
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
};

const external = Object.keys(globals);

const adapter = new GObjectAdapter();

export default defineConfig([
    {
        input: 'src/main/typescript/extension.ts',
        treeshake: {
            moduleSideEffects: 'no-external',
        },
        output: {
            sourcemap: false,
            file: `${buildPath}/extension.js`,
            format: 'iife',
            name: 'init',
            banner: [
                'try {',
            ].join('\n'),
            footer: [
                '}',
                'catch(err) {',
                '  logError(err, \'[Github Manager Extension] [init] Unxpected error\');',
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
            typescript({
                tsconfig: './tsconfig.json',
                transformers: {
                    before: [
                        adapter.beforeCompilation.bind(adapter)
                    ],
                    after: [
                        adapter.afterCompilation.bind(adapter)
                    ]
                }
            }),
            copy({
                targets: [
                    { src: './src/main/resources/*', dest: `${buildPath}` },
                ],
            }),
            execute([
                'mkdir -p ./build/schemas',
                'glib-compile-schemas src/main/schemas/ --targetdir=./build/schemas/'
            ])
        ],
    },
    {
        input: 'src/main/typescript/prefs.ts',
        output: {
            sourcemap: false,
            file: `${buildPath}/prefs.js`,
            format: 'iife',
            exports: 'default',
            name: 'prefs',
            globals,
            banner: ['imports.gi.versions.Gtk = \'4.0\';'].join('\n'),
            footer: [
                'var init = prefs.init;',
                'var buildPrefsWidget = prefs.buildPrefsWidget;'
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
            typescript({
                tsconfig: './tsconfig.json',
                transformers: {
                    before: [
                        adapter.beforeCompilation.bind(adapter)
                    ],
                    after: [
                        adapter.afterCompilation.bind(adapter)
                    ]
                }
            })
        ],
    },
]);
