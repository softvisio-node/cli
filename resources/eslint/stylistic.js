import eslintStylistic from "@stylistic/eslint-plugin";

const CONFIG = [

    // @stylistic:recommended
    eslintStylistic.configs[ "recommended" ],

    // @stylistic:custom
    {
        "name": "@stylistic custom",
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
            "@stylistic/curly-newline": [
                "error",
                {
                    "multiline": true,
                    "minElements": 2,
                    "consistent": true,
                },
            ],
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

            // XXX ugly formatting, blocking issue for prettier
            // "@stylistic/object-curly-newline": [
            //     "error", {
            //         "multiline": true,
            //         "consistent": true
            //     }
            // ],

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

const OVERRIDES = [

    // @stylistic:disable-legacy
    eslintStylistic.configs[ "disable-legacy" ],
];

export default Super =>
    class extends Super {

        // protected
        _createConfig () {
            return [

                //
                ...super._createConfig(),
                ...CONFIG,
            ];
        }

        _createEditorConfig ( editorConfig ) {
            const rules = {};

            const indent = editorConfig.indent_style === "tab"
                ? "tab"
                : editorConfig.indent_size;

            // override @stylistic/indent
            if ( indent ) {
                rules[ "@stylistic/indent" ] = [
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

                rules[ "@stylistic/jsx-indent-props" ] = [ "error", indent ];
            }

            // override @stylistic/no-tabs
            rules[ "@stylistic/no-tabs" ] = indent === "tab"
                ? "off"
                : "error";

            // override @stylistic/max-len
            if ( editorConfig.max_line_length ) {
                rules[ "@stylistic/max-len" ] = [
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
            rules[ "@stylistic/eol-last" ] = [ "error", editorConfig.insert_final_newline
                ? "always"
                : "never" ];

            // override @stylistic/no-trailing-spaces
            rules[ "@stylistic/no-trailing-spaces" ] = [
                "error",
                {
                    "skipBlankLines": !editorConfig.trim_trailing_whitespace,
                    "ignoreComments": !editorConfig.trim_trailing_whitespace,
                },
            ];

            return [

                //
                ...super._createEditorConfig( editorConfig ),
                {
                    "name": "stylistic editor config",
                    rules,
                },
            ];
        }

        _createOverrides () {
            return [

                //
                ...super._createOverrides(),
                ...OVERRIDES,
            ];
        }
    };
