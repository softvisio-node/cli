// import babelEslintParser from "@softvisio/babel/eslint-parser";
// import babelConfig from "@softvisio/babel/config";

export default {
    "name": "language options",

    "languageOptions": {
        "ecmaVersion": 2023,
        "sourceType": "module",

        // "parser": babelEslintParser,

        "parserOptions": {
            "sourceType": "module",
            "ecmaVersion": 2023,
            "ecmaFeatures": {
                "jsx": true,
            },

            "requireConfigFile": false,

            // "babelOptions": {
            //     "babelrc": false,
            //     "configFile": false,
            //     ...babelConfig,
            // },
        },
    },
};
