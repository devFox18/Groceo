// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const { FlatCompat } = require('@eslint/eslintrc');
const expoConfig = require('eslint-config-expo/flat');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = defineConfig([
  expoConfig,
  ...compat.config(require('./.eslintrc.js')),
  {
    ignores: ['dist/*', 'app-example/*'],
    rules: {
      'prettier/prettier': 'off',
    },
  },
]);
