import globals from "globals";
import eslintJs from "@eslint/js";
import eslintComments from "eslint-plugin-eslint-comments";
import eslintSoftvisio from "@softvisio/eslint-plugin";
import eslintStylistic from "@stylistic/eslint-plugin";
import eslintUnicorn from "eslint-plugin-unicorn";

const start = [
    // eslint:recommended
    eslintJs.configs.recommended,

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

    // unicorn
    {
        "name": "unicorn",
        "plugins": {
            "unicorn": eslintUnicorn,
        },
        "rules": {
            "unicorn/better-regex": "error",

            // "unicorn/prefer-optional-catch-binding": "error",
            "unicorn/catch-error-name": [
                "error",
                {
                    "name": "e",
                },
            ],
            "unicorn/escape-case": "error",

            // "unicorn/no-nested-ternary": "error",
            "unicorn/no-useless-fallback-in-spread": "error",
            "unicorn/no-zero-fractions": "error",
            "unicorn/number-literal-case": "error",
            "unicorn/numeric-separators-style": "error",

            // "unicorn/prefer-at": "error",
            "unicorn/prefer-date-now": "error",
            "unicorn/prefer-dom-node-append": "error",
            "unicorn/prefer-dom-node-remove": "error",
            "unicorn/prefer-modern-dom-apis": "error",
            "unicorn/prefer-modern-math-apis": "error",
            "unicorn/prefer-node-protocol": "error",
            "unicorn/prefer-regexp-test": "error",
            "unicorn/prefer-set-has": "error",
            "unicorn/prefer-set-size": "error",
            "unicorn/prefer-string-replace-all": "error",

            // "unicorn/prefer-string-slice": "error",
            // "unicorn/throw-new-error": "error",
        },
    },

    // eslintUnicorn.configs[ "flat/recommended" ],

    // {
    //     "rules": {
    //         "unicorn/explicit-length-check": "off", // XXX enable
    //         "unicorn/no-await-expression-member": "off", // XXX enable
    //         "unicorn/no-null": "off",
    //         "unicorn/prevent-abbreviations": "off",
    //         "unicorn/consistent-function-scoping": "off",
    //         "unicorn/no-anonymous-default-export": "off",
    //         "unicorn/no-hex-escape": "off",
    //         "unicorn/no-invalid-fetch-options": "off", // XXX false positive
    //         "unicorn/no-negated-condition": "off", // XXX enable
    //         "unicorn/no-for-loop": "off",
    //         "unicorn/no-process-exit": "off",
    //         "unicorn/prefer-number-properties": "off",
    //         "unicorn/prefer-spread": "off", // XXX enable
    //         "unicorn/prefer-string-raw": "off",
    //         "unicorn/prefer-switch": "off",
    //         "unicorn/prefer-ternary": "off",
    //         "unicorn/template-indent": "off", // XXX enable
    //     },
    // },

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
            "@softvisio/camel-case": [
                "error",
                {
                    "properties": "never",
                    "ignoreImports": true,
                    "allowConsecutiveCapitalLetters": false,
                    "allowedPrefixes": [ "API_" ],
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
            "no-lone-blocks": "off", // XXX we are using lone blocks for code folding in vim
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
];

const end = [

    // @stylistic:disable-legacy
    eslintStylistic.configs[ "disable-legacy" ],

    // @stylistic:all
    // eslintStylistic.configs[ "all-flat" ],

    // @stylistic:recommended
    eslintStylistic.configs[ "recommended-flat" ],

    // @stylistic
    {
        "name": "@stylistic",

        "rules": {
            "@stylistic/array-bracket-spacing": [ "error", "always" ],
            "@stylistic/arrow-parens": [ "error", "as-needed" ],
            "@stylistic/block-spacing": [ "error", "always" ],
            "@stylistic/brace-style": [ "error", "stroustrup", { "allowSingleLine": true } ],
            "@stylistic/comma-dangle": [ "error", "only-multiline" ],
            "@stylistic/comma-spacing": [ "error", { "before": false, "after": true } ],
            "@stylistic/computed-property-spacing": [ "error", "always" ],
            "@stylistic/function-paren-newline": [ "error", "multiline" ],
            "@stylistic/indent": [
                "error",
                4,
                {
                    "VariableDeclarator": {
                        "var": 1,
                        "let": 1,
                        "const": 1,
                    },
                },
            ],
            "@stylistic/indent-binary-ops": "off",
            "@stylistic/lines-around-comment": [
                "error",
                {
                    "beforeBlockComment": true,
                    "afterBlockComment": false,
                    "beforeLineComment": true,
                    "afterLineComment": false,
                },
            ],
            "@stylistic/lines-between-class-members": [
                "error",
                {
                    "enforce": [

                        //
                        { "blankLine": "always", "prev": "*", "next": "method" },
                        { "blankLine": "always", "prev": "method", "next": "*" },
                    ],
                },
            ],
            "@stylistic/max-statements-per-line": [ "error", { "max": 1 } ],

            // "@stylistic/no-extra-parens": [ "error", "all" ], // XXX test
            "@stylistic/no-extra-semi": "error",
            "@stylistic/operator-linebreak": [
                "error",
                "after",
                {
                    "overrides": {
                        "?": "before",
                        ":": "before",
                    },
                },
            ],
            "@stylistic/padded-blocks": "off", // NOTE conflicts with @stylistic/lines-around-comment
            "@stylistic/quote-props": [ "error", "always" ],
            "@stylistic/quotes": [ "error", "double", { "avoidEscape": true, "allowTemplateLiterals": true } ],
            "@stylistic/semi": [ "error", "always" ],
            "@stylistic/semi-spacing": [ "error", { "before": false, "after": true } ],
            "@stylistic/space-before-function-paren": [ "error", "always" ],
            "@stylistic/space-in-parens": [ "error", "always", { "exceptions": [ "empty" ] } ],
            "@stylistic/space-infix-ops": [ "error", { "int32Hint": false } ],
            "@stylistic/spaced-comment": [ "error", "always", { "markers": [ "*" ] } ],
            "@stylistic/template-curly-spacing": [ "error", "always" ],
        },
    },
];

export default function configure ( ...args ) {
    return [

        //
        ...start,
        ...args,
        ...end,
    ];
}
