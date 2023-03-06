import typescript from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import terser from '@rollup/plugin-terser';

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
    resolve({
        browser: true
    }),
    commonjs({ // rollup-plugin-commonjs
        include: 'node_modules/**'
    }),
    typescript({tsconfigOverride:{compilerOptions: {module: "ES2015" }}}),
    terser()
  ]
}
