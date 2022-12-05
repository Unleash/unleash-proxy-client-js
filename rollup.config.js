import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

import nodePolyfills from 'rollup-plugin-node-polyfills';

const name = 'unleash';

export default {
    input: './src/index.ts',
    output: [
        {
            file: './build/main.min.js',
            name,
            format: 'umd',
            sourcemap: true,
        },
    ],

    plugins: [
        commonjs({
            include: 'node_modules/**',
            extensions: ['.js'],
            ignoreGlobal: false,
        }),
        resolve({ sourcemap: true }),
        nodePolyfills({ sourcemap: true }),
        typescript({
            typescript: require('typescript'),
            compilerOptions: {
                lib: ['es5', 'dom'],
                target: 'es5',
                module: 'esnext',
                esModuleInterop: true,
                sourceRoot: '/src/',
            },
            inlineSourceMap: true,
            inlineSources: true,
            declaration: false,
            declarationMap: false,
        }),
        terser({
            sourceMap: true,
        }),
    ],
};
