import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    {
        ignores: ["**/dist", "**/.eslintrc.cjs"],
    },
    ...fixupConfigRules(compat.extends(
        "eslint:recommended",
        "@typescript-eslint/recommended",
        "plugin:react-hooks/recommended",
    )),
    {
        plugins: {
            react: fixupPluginRules(react),
            "react-hooks": fixupPluginRules(reactHooks),
            "react-refresh": reactRefresh,
            "@typescript-eslint": fixupPluginRules(typescriptEslint),
        },

        languageOptions: {
            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "module",
        },

        rules: {
            "react-refresh/only-export-components": [
                "warn",
                {
                    allowConstantExport: true,
                },
            ],
        },
    },
];
