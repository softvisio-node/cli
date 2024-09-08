export default {
    "name": "eslint:deprecated",

    "rules": {
        "brace-style": [ "error", "stroustrup", { "allowSingleLine": true } ],
        "comma-spacing": [ "error", { "before": false, "after": true } ],
        "function-paren-newline": [ "error", "multiline" ],
        "indent": [
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
        "lines-around-comment": [
            "error",
            {
                "beforeBlockComment": true,
                "afterBlockComment": false,
                "beforeLineComment": true,
                "afterLineComment": false,
            },
        ],
        "quote-props": [ "error", "always" ],
        "quotes": [ "error", "double", { "avoidEscape": true, "allowTemplateLiterals": true } ],
        "semi-spacing": [ "error", { "before": false, "after": true } ],
        "space-before-function-paren": [ "error", "always" ],
        "space-in-parens": [ "error", "always", { "exceptions": [ "empty" ] } ],
        "space-infix-ops": [ "error", { "int32Hint": false } ],
        "spaced-comment": [ "error", "always", { "markers": [ "*" ] } ],
        "array-bracket-spacing": [ "error", "always" ],
        "template-curly-spacing": [ "error", "always" ],
        "computed-property-spacing": [ "error", "always" ],
    },
};
