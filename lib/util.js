const ansi = require( "@softvisio/core/ansi" );

module.exports.reportFile = function ( name, res, maxNameLength ) {
    name = name + " ".repeat( maxNameLength - name.length );

    console.log( `${name}    ${res.isModified ? ansi.error( " modified " ) : " -        "}    ${res.ok ? res : ansi.error( " " + res + " " )}` );
};

module.exports.preparePattern = function ( pattern, root ) {
    const glob = require( "glob" ),
        fs = require( "fs" );

    pattern = pattern.replace( /\\/g, "/" );

    if ( glob.hasMagic( pattern ) ) return pattern;

    let stat;

    try {
        stat = fs.statSync( root + "/" + pattern );
    }
    catch ( e ) {
        return pattern;
    }

    if ( stat.isFile() ) {
        return pattern;
    }
    else if ( stat.isDirectory() ) {
        return pattern + "/**";
    }
    else {
        return pattern;
    }
};
