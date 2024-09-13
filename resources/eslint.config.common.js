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

    // unicorn
    {
        "name": "unicorn",
        "plugins": {
            "unicorn": eslintUnicorn,
        },
        "rules": {
            "unicorn/better-regex": "error",
            "unicorn/prefer-optional-catch-binding": "error",
            "unicorn/catch-error-name": [
                "error",
                {
                    "name": "e",
                },
            ],
            "unicorn/escape-case": "error",
            "unicorn/new-for-builtins": "error",

            // XXX "unicorn/no-array-for-each": "error",
            // XXX "unicorn/no-array-reduce": "error",

            // XXX "unicorn/no-await-expression-member": "error",

            "unicorn/no-instanceof-array": "error",
            "unicorn/no-length-as-slice-end": "error",

            // XXX "unicorn/no-lonely-if": "error",

            "unicorn/no-useless-fallback-in-spread": "error",
            "unicorn/no-zero-fractions": "error",
            "unicorn/number-literal-case": "error",
            "unicorn/numeric-separators-style": "error",
            "unicorn/prefer-at": "error",
            "unicorn/prefer-date-now": "error",
            "unicorn/prefer-dom-node-append": "error",
            "unicorn/prefer-dom-node-remove": "error",
            "unicorn/prefer-modern-dom-apis": "error",
            "unicorn/prefer-modern-math-apis": "error",
            "unicorn/prefer-negative-index": "error",
            "unicorn/prefer-node-protocol": "error",
            "unicorn/prefer-number-properties": [
                "error",
                {
                    "checkInfinity": false,
                    "checkNaN": false,
                },
            ],
            "unicorn/prefer-regexp-test": "error",
            "unicorn/prefer-set-has": "error",
            "unicorn/prefer-set-size": "error",
            "unicorn/prefer-string-replace-all": "error",
            "unicorn/prefer-string-starts-ends-with": "error",
            "unicorn/prefer-string-trim-start-end": "error",
            "unicorn/prefer-structured-clone": "error",
            "unicorn/prefer-string-slice": "error",
            "unicorn/relative-url-style": "error",
            "unicorn/text-encoding-identifier-case": "error",
        },
    },

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
            // eslint-comments
            "eslint-comments/disable-enable-pair": [
                "error",
                {
                    "allowWholeFile": true,
                },
            ],
            "eslint-comments/no-unused-disable": "error",

            // eslint
            "curly": [ "error", "multi-line", "consistent" ],
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

    // @softvisio:recommended
    eslintSoftvisio.configs.recommended,

    // @softvisio:custom
    {
        "name": "@softvisio:custom",
        "rules": {
            "@softvisio/camel-case": [
                "error",
                {
                    "properties": "never",
                    "ignoreImports": true,
                    "allowConsecutiveCapitalLetters": false,
                    "allowedPrefixes": [ "API_" ],
                },
            ],
        },
    },

    // @stylistic:disable-legacy
    eslintStylistic.configs[ "disable-legacy" ],

    // @stylistic:all
    // eslintStylistic.configs[ "all-flat" ],

    // @stylistic:recommended
    eslintStylistic.configs[ "recommended-flat" ],

    // @stylistic:custom
    {
        "name": "@stylistic:custom",
        "rules": {
            "@stylistic/array-bracket-spacing": [ "error", "always" ],
            "@stylistic/arrow-parens": [ "error", "as-needed" ],
            "@stylistic/block-spacing": [ "error", "always" ],
            "@stylistic/brace-style": [
                "error",
                "stroustrup",
                {
                    "allowSingleLine": false,
                },
            ],
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
            "@stylistic/multiline-ternary": [ "error", "always" ],

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

export class Config {

    // public
    create ( { config, editorConfig } = {} ) {
        return [

            //
            ...start,
            ...config,
            ...end,
            ...this.customize( editorConfig ),
        ];
    }

    customize ( editorConfig ) {
        if ( !editorConfig ) return [];

        const config = {
            "name": "customized common config",
            "rules": {},
        };

        const indent = editorConfig.indent_style === "tab"
            ? "tab"
            : editorConfig.indent_size;

        // override @stylistic/indent
        if ( indent ) {
            config.rules[ "@stylistic/indent" ] = [
                "error",
                indent,
                {
                    "VariableDeclarator": {
                        "var": 1,
                        "let": 1,
                        "const": 1,
                    },
                },
            ];

            // config.rules[ "@stylistic/indent-binary-ops" ] = [ "error", indent ];

            config.rules[ "@stylistic/jsx-indent-props" ] = [ "error", indent ];
        }

        // override @stylistic/no-tabs
        config.rules[ "@stylistic/no-tabs" ] = indent === "tab"
            ? "off"
            : "error";

        // override @stylistic/max-len
        if ( editorConfig.max_line_length ) {
            config.rules[ "@stylistic/max-len" ] = [
                "error",
                {
                    "code": editorConfig.max_line_length === "off"
                        ? Infinity
                        : editorConfig.max_line_length,
                    "tabWidth": editorConfig.tab_width,
                },
            ];
        }

        // override @stylistic/eol-last
        config.rules[ "@stylistic/eol-last" ] = [ "error", editorConfig.insert_final_newline
            ? "always"
            : "never" ];

        // override @stylistic/no-trailing-spaces
        config.rules[ "@stylistic/no-trailing-spaces" ] = [
            "error",
            {
                "skipBlankLines": !editorConfig.trim_trailing_whitespace,
                "ignoreComments": !editorConfig.trim_trailing_whitespace,
            },
        ];

        return [ config ];
    }
}
