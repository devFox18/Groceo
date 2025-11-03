module.exports = {
  root: true,
  extends: ['@react-native/eslint-config', 'eslint-config-expo', 'prettier'],
  plugins: ['react-hooks'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  ignorePatterns: ['dist/', 'app-example/'],
};
