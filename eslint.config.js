import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
	{ files: ["src/**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ['js/recommended'] },
	{ files: ["src/**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { globals: {...globals.browser, ...globals.node, ...globals.es2025} } },
	tseslint.configs.strict,
	{
		rules: {
			'@typescript-eslint/no-duplicate-enum-values': 'off',
			'@typescript-eslint/unified-signatures': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off', // god bless
			'@typescript-eslint/no-unused-vars': ['warn', { args: 'none', vars: 'all', caughtErrors: 'all' }]
		}
	},
]);
