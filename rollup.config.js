import typescript from 'rollup-plugin-typescript2';
import minify from 'rollup-plugin-babel-minify';

export default {
  input: './src/index.ts',
  output: [
    {
     file: './build/main.min.js',
     format: 'iife',
     name: 'unleash' // the global which can be used in a browser
    }
   ],
  plugins: [
    typescript({tsconfigOverride:{compilerOptions: {module: "ES2015",}}}),
    minify( {comments: false} )
  ]
}