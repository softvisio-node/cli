// import babelEslintParser from "@babel/eslint-parser";
// import { createConfig } from "@softvisio/babel";

const CONFIG = [
    {
        "name": "language options",

        "languageOptions": {
            "ecmaVersion": "latest",
            "sourceType": "module",

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

        // public
        wrap ( config ) {
            return [

                //
                ...CONFIG,
                ...super.wrap( config ),
            ];
        }
    };
