import js from "@eslint/js";
import eslintCommon from "./eslint.config.common.js";

export default [
    // eslint:recommended
    js.configs.recommended,

    // javajscript language options
    {
        "name": "javascript language options",

        "languageOptions": {
            "ecmaVersion": 2023,
            "sourceType": "module",

            "parserOptions": {
                "sourceType": "module",
                "ecmaVersion": 2023,
                "ecmaFeatures": {
                    "jsx": true,
                },

                // babel parser
                // "parser": "@babel/eslint-parser",
                // "requireConfigFile": false,
                // "babelOptions": {
                //     "presets": [ [ require.resolve( "@babel/preset-env" ), { "shippedProposals": true } ] ],
                // },
            },

            // "parserOptions": {
            //     "sourceType": "module",
            //     "ecmaVersion": 2023,
            //     "ecmaFeatures": {
            //         "jsx": true,
            //     },
            // },
        },
    },

    // common
    ...eslintCommon,
];
