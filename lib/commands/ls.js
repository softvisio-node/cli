const { throwError, isProjectRoot } = require( "../util" );

module.exports = class {
    static cli () {
        return {
            "summary": "List projects in workspace.",
        };
    }

    async run () {
        var workspace = process.env.WORKSPACE;

        if ( !workspace ) throwError( `"WORKSPACE" environment variable is not defined.` );
    }
};

// ----- SOURCE FILTER LOG BEGIN -----
//
// ERROR, 1:21, no-unused-vars, 'isProjectRoot' is assigned a value but never used.
//
// ----- SOURCE FILTER LOG END -----
