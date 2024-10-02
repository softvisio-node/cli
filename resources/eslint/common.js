import globals from "globals";
import eslintJs from "@eslint/js";
import eslintComments from "eslint-plugin-eslint-comments";
import eslintSoftvisio from "@softvisio/eslint-plugin";
import Stylistic from "./stylistic.js";
import Unicorn from "./unicorn.js";

const START = [
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

const END = [

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
];

export default Super =>
    class extends Stylistic( Unicorn( Super || class {} ) ) {

        // protected
        _wrap ( config ) {
            return [

                //
                ...START,
                ...super._wrap( config ),
                ...END,
            ];
        }
    };