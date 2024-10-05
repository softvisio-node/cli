const { createRequire } = require( "node:module" );
const url = require( "node:url" );

// const resolve = require( "enhanced-resolve" );

function resolve ( name, from ) {
    try {
        return createRequire( url.pathToFileURL( from ) ).resolve( name );
    }
    catch {
        return;
    }
}

// XXX improve
function isCoreModule ( name ) {
    if ( name.startsWith( "node:" ) ) {
        return true;
    }
    else {
        return false;
    }
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
