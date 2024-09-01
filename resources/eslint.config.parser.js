import babelEslintParser from "@babel/eslint-parser";
import babelPresetEnv from "@babel/preset-env";
import babelPluginSyntaxImportAssertions from "@babel/plugin-syntax-import-assertions";

export default {
    "name": "babel parser",

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
};
