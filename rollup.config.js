import typescript from '@rollup/plugin-typescript';
import {terser} from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

import nodePolyfills from 'rollup-plugin-node-polyfills';


export default {
    input: './src/index.ts',
    output: [
        {
            file: './build/main.min.js',
            format: 'umd',
            name: 'unleash' // the global which can be used in a browser
        }
    ],
    plugins: [
        nodePolyfills(),
        resolve({}),
        commonjs({ // rollup-plugin-commonjs
            include: 'node_modules/**'
        }),
        typescript({ compilerOptions: { module: 'ES2015' } }),
        terser()
    ]
}
