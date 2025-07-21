import eslintJs from "@eslint/js";

const CONFIG = [
    // eslint:recommended
    eslintJs.configs.recommended,

    // common config
    {
        "name": "eslint custom",
        "rules": {
            // eslint
            "curly": [ "error", "multi-line", "consistent" ],
            "eqeqeq": [ "error", "smart" ],
            "grouped-accessor-pairs": [ "error", "getBeforeSet" ],
            "no-constructor-return": "error",
            "no-lone-blocks": "off", // XXX we are using lone blocks for code folding in vim
            "no-useless-constructor": "error",
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
