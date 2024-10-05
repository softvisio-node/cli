const { createRequire, builtinModules } = require( "node:module" );
const url = require( "node:url" );

// const resolve = require( "enhanced-resolve" );

const coreModules = new Set( builtinModules );

function resolve ( name, from ) {
    try {
        return createRequire( url.pathToFileURL( from ) ).resolve( name );
    }
    catch {}
}

function isCoreModule ( name ) {
    return coreModules.has( name.replace( "node:", "" ) );
}

exports.interfaceVersion = 2;

exports.resolve = function ( name, from, config ) {
    if ( isCoreModule( name ) ) {
        return {
            "found": true,
            "path": null,
        };
    }

    try {

        // const path = resolve.sync( name, from );
        const path = resolve( name, from );

        return {
            "found": !!path,
            path,
        };
    }
    catch {
        return {
            "found": false,
        };
    }
};
