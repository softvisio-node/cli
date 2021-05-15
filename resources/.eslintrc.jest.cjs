const config = {
    ...JSON.parse( JSON.stringify( require( "./.eslintrc.javascript.cjs" ) ) ),

    "settings": {
        "jest": {
            "version": require( "../node_modules/jest/package.json" ).version.split( "." )[0],
        },
    },
};

config.extends.unshift( "plugin:jest/recommended" );

module.exports = config;
