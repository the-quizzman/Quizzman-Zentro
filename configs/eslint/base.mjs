import { defineConfig } from 'eslint';

export default defineConfig({
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Enforce import boundaries
    'import/no-cycle': 'error',
    'no-restricted-imports': ['error', {
      patterns: [
        // core cannot import modules
        { group: ['@qmf/header', '@qmf/footer', '@qmf/chat-embed', '@qmf/noti-embed', '@qmf/loading-screen', '@qmf/auth-shell'], message: 'Core cannot depend on modules.' },
        // ui cannot import modules
        { group: ['@qmf/header', '@qmf/footer', '@qmf/chat-embed', '@qmf/noti-embed'], message: 'UI kit cannot depend on modules.' },
        // No dist imports
        { group: ['**/dist/**'], message: 'Do not import from dist directly.' },
      ],
    }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: ['dist', 'node_modules', '_legacy_qmf'],
});
