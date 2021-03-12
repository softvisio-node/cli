const config = {
    ...JSON.parse( JSON.stringify( require( "./.eslintrc.javascript.js" ) ) ),

    "plugins": ["@typescript-eslint"],

    "parserOptions": {
        "parser": "@typescript-eslint/parser",
    },
};

config.extends.unshift( "plugin:@typescript-eslint/recommended" );

module.exports = config;
