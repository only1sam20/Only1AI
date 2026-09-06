import { defineConfig, globalIgnores } from 'eslint/config';
import nextPlugin from '@next/eslint-plugin-next';

export default defineConfig([
  { plugins: { '@next/next': nextPlugin }, rules: nextPlugin.configs.recommended.rules },
  globalIgnores(['.next/**', '.next-*/**', 'node_modules/**']),
]);
