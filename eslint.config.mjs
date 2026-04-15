import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import globals from 'globals'
import importPlugin from 'eslint-plugin-import'
import tseslint from 'typescript-eslint'
import sonarjs from 'eslint-plugin-sonarjs'

const typeCheckedRules = {
  '@typescript-eslint/consistent-type-imports': [
    'error',
    {
      prefer: 'type-imports',
      fixStyle: 'inline-type-imports',
    },
  ],
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': [
    'error',
    {
      checksVoidReturn: {
        attributes: false,
      },
    },
  ],
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      caughtErrors: 'all',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/only-throw-error': 'error',
  '@typescript-eslint/return-await': ['error', 'always'],
  'import/no-default-export': 'error',
  'import/no-duplicates': 'error',
}

export default defineConfig(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  sonarjs.configs.recommended,
  {
    files: ['src/**/*.ts'],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.es2024,
        ...globals.node,
        Bun: 'readonly',
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
    rules: typeCheckedRules,
  },
  {
    files: ['src/**/*.test.ts', 'src/**/test-helpers.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'sonarjs/no-duplicate-string': 'off',
      // /tmp usage in tests is intentional
      'sonarjs/publicly-writable-directories': 'off',
      // anchored regexes (^) don't have ReDoS risk
      'sonarjs/slow-regex': 'off',
    },
  }
)
