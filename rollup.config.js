import json from 'rollup-plugin-json'

export default {
  input: 'index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
  },
  plugins: [
    json(),
  ]
}
