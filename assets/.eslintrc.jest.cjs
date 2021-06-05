const config = {
    ...JSON.parse( JSON.stringify( require( "./.eslintrc.javascript.cjs" ) ) ),
};

config.extends.unshift( "plugin:jest/recommended" );

config.globals ||= {};
config.globals.bench = "readonly";

config.settings ||= {};
config.settings.jest = {
    "version": 27, // require( "../node_modules/jest/package.json" ).version.split( "." )[0],
};

module.exports = config;
