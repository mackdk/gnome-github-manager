import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import execute from 'rollup-plugin-shell';

const buildPath = 'build';

export default [
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
            exports: 'default',
            assetFileNames: '[name][extname]',
        },
        plugins: [
            commonjs(),
            nodeResolve({
                preferBuiltins: false,
            }),
            typescript({
                tsconfig: './tsconfig.json',
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
            banner: ['imports.gi.versions.Gtk = \'4.0\';'].join('\n'),
            footer: [
                'var init = prefs.init;',
                'var buildPrefsWidget = prefs.buildPrefsWidget;'
            ].join('\n'),
        },
        treeshake: {
            moduleSideEffects: 'no-external',
        },
        plugins: [
            commonjs(),
            nodeResolve({
                preferBuiltins: false,
            }),
            typescript({
                tsconfig: './tsconfig.json',
            })
        ],
    },
];
