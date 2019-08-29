import typescript from 'rollup-plugin-typescript2';
import minify from 'rollup-plugin-babel-minify';

export default {
  input: './src/index.ts',
  output: [
    {
     file: './build/main.iife.js',
     format: 'iife',
     name: 'unleash' // the global which can be used in a browser
    }
   ],
  plugins: [
    typescript({lib: ["es5", "es6", "dom"], target: "es5"}),
    minify( {comments: false} )
  ]
}