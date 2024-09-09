import eslintStylistic from "@stylistic/eslint-plugin";

export default [

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
                    "enforce": [ { "blankLine": "always", "prev": "*", "next": "method" } ],
                },
            ],
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
