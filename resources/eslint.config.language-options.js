// import babelEslintParser from "@babel/eslint-parser";
// import { createConfig } from "@softvisio/babel";

export default [
    {
        "name": "language options",

        "languageOptions": {
            "ecmaVersion": 2023,
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
