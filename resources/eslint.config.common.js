import globals from "globals";
import eslintComments from "eslint-plugin-eslint-comments";
import eslintSoftvisio from "@softvisio/eslint-plugin";

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

    // softvisio:recommended
    eslintSoftvisio.configs.recommended,

    // common config
    {
        "name": "common config",

        "languageOptions": {
            "globals": {
                ...globals.node,
                ...globals.browser,
                "Ext": "readonly",
                "l10n": "readonly",
                "l10nt": "readonly",
                "msgid": "readonly",
                "result": "readonly",
            },
        },

        "rules": {
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
            "eslint-comments/no-unused-disable": "error",
            "eslint-comments/disable-enable-pair": [ "error", { "allowWholeFile": true } ],

            // eslint:recommended
            "brace-style": [ "error", "stroustrup", { "allowSingleLine": true } ],
            "comma-spacing": [ "error", { "before": false, "after": true } ],
            "curly": [ "error", "multi-line" ],
            "eqeqeq": [ "error", "smart" ],
            "function-paren-newline": [ "error", "multiline" ],
            "grouped-accessor-pairs": [ "error", "getBeforeSet" ],

            // "indent": [
            //     "error",
            //     4, // XXX need to take from the .editorconfig
            //     {
            //         "VariableDeclarator": {
            //             "var": 1,
            //             "let": 1,
            //             "const": 1,
            //         },
            //     },
            // ],

            "lines-around-comment": [
                "error",
                {
                    "beforeBlockComment": true,
                    "afterBlockComment": false,
                    "beforeLineComment": true,
                    "afterLineComment": false,
                },
            ],

            "no-constant-condition": [ "error", { "checkLoops": false } ],
            "no-constructor-return": [ "error" ],
            "no-control-regex": "off",
            "no-empty": [ "error", { "allowEmptyCatch": true } ],
            "no-global-assign": "error",
            "no-regex-spaces": "error",
            "no-unused-vars": [ "error", { "args": "none", "caughtErrors": "none" } ],
            "prefer-const": "error",
            "prefer-exponentiation-operator": "error",
            "quote-props": [ "error", "always" ],
            "quotes": [ "error", "double", { "avoidEscape": true, "allowTemplateLiterals": true } ],
            "semi-spacing": [ "error", { "before": false, "after": true } ],
            "space-before-function-paren": [ "error", "always" ],
            "space-in-parens": [ "error", "always", { "exceptions": [ "empty" ] } ],
            "space-infix-ops": [ "error", { "int32Hint": false } ],
            "spaced-comment": [ "error", "always", { "markers": [ "*" ] } ],
            "yoda": [ "error", "never", { "exceptRange": true } ],
            "array-bracket-spacing": [ "error", "always" ],
            "template-curly-spacing": [ "error", "always" ],
            "computed-property-spacing": [ "error", "always" ],
        },
    },
];
