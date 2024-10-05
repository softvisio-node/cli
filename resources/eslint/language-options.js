// import babelEslintParser from "@babel/eslint-parser";
// import { createConfig } from "@softvisio/babel";

const CONFIG = [
    {
        "name": "language options",
        "languageOptions": {
            "sourceType": "module",
            "ecmaVersion": "latest",

            "parserOptions": {
                "sourceType": "module",
                "ecmaVersion": "latest",
                "ecmaFeatures": {
                    "jsx": true,
                },

                "requireConfigFile": false,

                // "parser": babelEslintParser,
                // "babelOptions": createConfig(),
            },
        },
    },
];

export default Super =>
    class extends ( Super || class {} ) {

        // protected
        _wrap ( config ) {
            return [

                //
                ...super._wrap( config ),
                ...CONFIG,
            ];
        }
    };
