import copy from 'rollup-plugin-copy';
import execute from 'rollup-plugin-shell';

const buildPath = 'build';

export default [
    {
        input: 'src/main/javascript/extension.js',
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
        input: 'src/main/javascript/prefs.js',
        output: {
            sourcemap: false,
            file: `${buildPath}/prefs.js`,
            format: 'iife',
            exports: 'default',
            name: 'prefs',
        },
        treeshake: {
            moduleSideEffects: 'no-external',
        },
    },
];
