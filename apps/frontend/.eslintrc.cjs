module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-refresh'],
  rules: {
    // Project currently uses many non-memoized callbacks in effects; disable until cleaned up.
    'react-hooks/exhaustive-deps': 'off',
    // Allow non-component exports in context/hooks files.
    'react-refresh/only-export-components': 'off',
    // Keep unused vars strict, but allow underscore-prefixed placeholders.
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
  },
}