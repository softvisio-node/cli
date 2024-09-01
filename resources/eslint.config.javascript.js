import js from "@eslint/js";
import eslintCommon from "./eslint.config.common.js";
import babelEslintParser from "@babel/eslint-parser";
import babelPresetEnv from "@babel/preset-env";
import babelPluginSyntaxImportAssertions from "@babel/plugin-syntax-import-assertions";

export default [
    // eslint:recommended
    js.configs.recommended,

    // javajscript language options
    {
        "name": "javascript language options",

        "languageOptions": {
            "ecmaVersion": 2023,
            "sourceType": "module",

            "parser": babelEslintParser,

            "parserOptions": {
                "sourceType": "module",
                "ecmaVersion": 2023,
                "ecmaFeatures": {
                    "jsx": true,
                },

                // babel parser
                "requireConfigFile": false,
                "babelOptions": {

                    // "babelrc": false,
                    // "configFile": false,

                    "presets": [
                        [
                            babelPresetEnv,
                            {
                                "bugfixes": true,
                                "corejs": 3,
                                "loose": false,
                                "debug": false,
                                "modules": false,
                                "targets": {},
                                "useBuiltIns": "usage",
                                "ignoreBrowserslistConfig": undefined,
                                "exclude": [ "es.array.iterator", "es.promise", "es.object.assign", "es.promise.finally" ],
                                "shippedProposals": true,
                            },
                        ],
                    ],

                    "plugins": [

                        //
                        babelPluginSyntaxImportAssertions,
                    ],
                },
            },
        },
    },

    // common
    ...eslintCommon,
];
