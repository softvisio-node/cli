import globals from "globals";
import eslintComments from "eslint-plugin-eslint-comments";
import eslintSoftvisio from "@softvisio/eslint-plugin";
import eslintStylistic from "./eslint.config.stylistic.js";

export default [
    // eslint-comments:recommended
    {
        "name": "eslint-comments",
        "plugins": {
            "eslint-comments": eslintComments,
        },
        "rules": {
            ...eslintComments.configs.recommended.rules,
        },
    },

    // @softvisio:recommended
    eslintSoftvisio.configs.recommended,

    // common config
    {
        "name": "common config",

        "languageOptions": {
            "globals": {
                ...globals.node,
                ...globals.browser,
                "Ext": "readonly",
                "Temporal": "readonly",
                "l10n": "readonly",
                "l10nt": "readonly",
                "msgid": "readonly",
                "result": "readonly",
            },
        },

        "rules": {

            // @softvisio:recommended
            "@softvisio/camelcase": [
                "error",
                {
                    "properties": "never",
                    "ignoreImports": true,
                    "allowConsecutiveCapitalLetters": false,
                    "allowedPrefixes": [ "API_", "CALLBACK_", "COMMAND_" ],
                },
            ],

            // eslint comments
            "eslint-comments/disable-enable-pair": [ "error", { "allowWholeFile": true } ],
            "eslint-comments/no-unused-disable": "error",

            // eslint core rules
            "curly": [ "error", "multi-line" ],
            "eqeqeq": [ "error", "smart" ],
            "grouped-accessor-pairs": [ "error", "getBeforeSet" ],
            "no-constructor-return": [ "error" ],
            "prefer-const": "error",
            "prefer-exponentiation-operator": "error",
            "yoda": [ "error", "never", { "exceptRange": true } ],

            // eslint:recommended
            "no-constant-condition": [ "error", { "checkLoops": false } ],
            "no-control-regex": "off",
            "no-empty": [ "error", { "allowEmptyCatch": true } ],
            "no-global-assign": "error",
            "no-regex-spaces": "error",
            "no-unused-vars": [ "error", { "args": "none", "caughtErrors": "none" } ],
        },
    },

    // @stylistic
    ...eslintStylistic,
];
