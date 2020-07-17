const ansi = require( "@softvisio/core/ansi" );

module.exports.reportFile = function ( name, res, maxNameLength ) {
    name = name + " ".repeat( maxNameLength - name.length );

    console.log( `${name}    ${res.isModified ? ansi.error( " modified " ) : " -        "}    ${res.ok ? res : ansi.error( " " + res + " " )}` );
};
