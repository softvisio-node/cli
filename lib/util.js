const colors = require( "ansi-colors" );

colors.theme( {
    "error": colors.bgRed.bold.white,
} );

module.exports.reportFile = function ( name, res, maxNameLength ) {
    name = name + " ".repeat( maxNameLength - name.length );

    console.log( `${name}    ${res.isModified ? colors.error( " modified " ) : " -        "}    ${res.ok ? res : colors.error( " " + res + " " )}` );
};
