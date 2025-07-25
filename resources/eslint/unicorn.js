import eslintUnicorn from "eslint-plugin-unicorn";

const CONFIG = [
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

            "unicorn/consistent-assert": "error",
            "unicorn/consistent-date-clone": "error",
            "unicorn/escape-case": "error",
            "unicorn/new-for-builtins": "error",
            "unicorn/no-accessor-recursion": "error",

            // XXX "unicorn/no-array-for-each": "error",
            // XXX "unicorn/no-array-reduce": "error",
            // XXX "unicorn/no-await-expression-member": "error",

            "unicorn/no-instanceof-builtins": "error",
            "unicorn/no-length-as-slice-end": "error",

            // XXX "unicorn/no-lonely-if": "error",

            "unicorn/no-named-default": "error",
            "unicorn/no-unnecessary-array-flat-depth": "error",
            "unicorn/no-unnecessary-array-splice-count": "error",
            "unicorn/no-useless-error-capture-stack-trace": "error",
            "unicorn/no-useless-fallback-in-spread": "error",
            "unicorn/no-zero-fractions": "error",
            "unicorn/number-literal-case": "error",
            "unicorn/numeric-separators-style": "error",
            "unicorn/prefer-at": "error",
            "unicorn/prefer-class-fields": "error",
            "unicorn/prefer-date-now": "error",
            "unicorn/prefer-dom-node-append": "error",
            "unicorn/prefer-dom-node-remove": "error",
            "unicorn/prefer-import-meta-properties": "error",
            "unicorn/prefer-modern-dom-apis": "error",
            "unicorn/prefer-modern-math-apis": "error",
            "unicorn/prefer-negative-index": "error",

            // XXX duplicate "import/enforce-node-protocol-usage"
            // "unicorn/prefer-node-protocol": "error",

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
            "unicorn/require-module-specifiers": "error",
            "unicorn/relative-url-style": "error",
            "unicorn/text-encoding-identifier-case": "error",
            "unicorn/no-unnecessary-await": "error",
        },
    },
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
    };
