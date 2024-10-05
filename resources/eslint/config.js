import eslintJs from "@eslint/js";
import eslintSoftvisio from "@softvisio/eslint-plugin";
import eslintComments from "eslint-plugin-eslint-comments";
import mixins from "#core/mixins";
import Globals from "./globals.js";
import Import from "./import.js";
import LanguageOptions from "./language-options.js";
import Stylistic from "./stylistic.js";
import Unicorn from "./unicorn.js";

const CONFIG = [
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

const OVERRIDES = [

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

class BaseConfig {

    // public
    create ( editorConfig ) {
        return [

            //
            ...this.createConfig(),
            ...this.createEditorConfig( editorConfig ),
            ...this.createOverrides(),
        ];
    }

    createConfig () {
        return this._createConfig();
    }

    createEditorConfig ( editorConfig ) {
        if ( editorConfig ) {
            return this._createEditorConfig( editorConfig );
        }
        else {
            return [];
        }
    }

    createOverrides () {
        return this._createOverrides();
    }

    // protected
    _createConfig () {
        return [];
    }

    _createEditorConfig ( editorConfig ) {
        return [];
    }

    _createOverrides () {
        return [];
    }
}

export default class Config extends mixins( LanguageOptions, Stylistic, Import, Unicorn, Globals, BaseConfig ) {

    // protected
    _createConfig () {
        return [

            //
            ...super._createConfig(),
            ...CONFIG,
        ];
    }

    _createOverrides () {
        return [

            //
            ...super._createOverrides(),
            ...OVERRIDES,
        ];
    }
}
