import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig({
	files: ['src/**/*.{js,ts}'],
	languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.es2025 } },
	extends: [
		js.configs.recommended,
		tseslint.configs.strict,
	],
	rules: {
		'@typescript-eslint/no-duplicate-enum-values': 'off',
		'@typescript-eslint/unified-signatures': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off', // god bless
		'@typescript-eslint/no-unused-vars': ['warn', { args: 'none', vars: 'all', caughtErrors: 'all' }]
	}
});
