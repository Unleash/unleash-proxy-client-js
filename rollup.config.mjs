import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import replace from '@rollup/plugin-replace';
import fs from 'fs';

const version = JSON.parse(fs.readFileSync('./package.json', 'UTF-8')).version;

export default {
    input: './src/index.ts',
    output: [
        {
            file: './build/main.min.js',
            format: 'umd',
            sourcemap: true,
            name: 'unleash', // the global which can be used in a browser
        },
        {
            file: './build/main.esm.js',
            format: 'esm',
            sourcemap: true,
        },
        {
            file: './build/index.cjs',
            format: 'cjs',
            sourcemap: true,
        }
    ],
    plugins: [
        replace({
            '__VERSION__': version,
            preventAssignment: true
        }),
        typescript({
            compilerOptions: {
                lib: ['es5', 'es6', 'dom'],
                module: 'ES2015',
                target: 'es5',
            },
            sourceMap: true,
        }),
        nodePolyfills(),
        nodeResolve({
            browser: true,
        }),
        commonjs({
            include: 'node_modules/**',
        }),
        terser(),
    ],
};
