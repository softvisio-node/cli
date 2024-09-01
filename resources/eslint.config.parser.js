import babelEslintParser from "@softvisio/babel/eslint-parser";
import { fileURLToPath } from "node:url";

const babelConfig = fileURLToPath( import.meta.resolve( "@softvisio/babel/babel.config" ) );

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
                "babelrc": false,
                "configFile": babelConfig,
            },
        },
    },
};
