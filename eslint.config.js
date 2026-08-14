import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
	globalIgnores([
		'**/*.*',
		'!src/**/*.{js,ts}'
	]),
	{
		files: ['src/**/*.{js,ts}'],
		languageOptions: {
			globals: { ...globals.browser, ...globals.node, ...globals.es2025 },
			parserOptions: {
				projectService: true,
			}
		},
		extends: [
			js.configs.recommended,
			tseslint.configs.strictTypeChecked,
		],
		rules: {
			'@typescript-eslint/restrict-template-expressions': 'off',
			'@typescript-eslint/no-unnecessary-condition': 'off',
			'@typescript-eslint/restrict-plus-operands': 'off',
			'@typescript-eslint/no-duplicate-enum-values': 'off',
			'@typescript-eslint/unified-signatures': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off', // god bless
			'@typescript-eslint/no-unused-vars': ['warn', { args: 'none', vars: 'all', caughtErrors: 'all' }]
		}
	}
]);
