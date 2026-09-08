import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      react.configs.flat['jsx-runtime'], // <-- 1. Agregado: activa el soporte de React y JSX
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Ignora variables o argumentos no usados si empiezan con mayúscula o guión bajo
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^[A-Z_]',
          argsIgnorePattern: '^[A-Z_]', // <-- 2. Agregado: también cubre argumentos de funciones como en .map()
        },
      ],
      'react/jsx-uses-vars': 'error', // <-- 3. Agregado: enseña a ESLint que <StepIcon /> cuenta como uso
    },
  },
])