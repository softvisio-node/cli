// import babelEslintParser from "@babel/eslint-parser";
// import babelConfig from "@softvisio/babel/config";

export default {
    "name": "language options",

    "languageOptions": {
        "ecmaVersion": 2023,
        "sourceType": "module",

        "parserOptions": {
            "sourceType": "module",
            "ecmaVersion": 2023,
            "ecmaFeatures": {
                "jsx": true,
            },

            "requireConfigFile": false,

            // "parser": babelEslintParser,

            // "babelOptions": {
            //     "babelrc": false,
            //     "configFile": false,
            //     ...babelConfig,
            // },
        },
    },
};
