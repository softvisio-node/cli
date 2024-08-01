import { mergeObjects } from "#core/utils";
import baseConfig from "./eslint.config.javascript.js";

const config = mergeObjects( {}, baseConfig, {
    "plugins": [ "@typescript-eslint" ],

    "parserOptions": {
        "parser": "@typescript-eslint/parser",
    },
} );

config.extends.unshift( "plugin:@typescript-eslint/recommended" );

export default config;
