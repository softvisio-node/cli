const { throwError, isProjectRoot } = require( "../util" );

module.exports = class {
    static cli () {
        return {
            "summary": "List projects in workspace.",
        };
    }

    async run () {
        const fs = require( "@softvisio/core/fs" ),
            { createStream, getBorderCharacters } = require( "table" ),
            colors = require( "ansi-colors" ),
            Git = require( "../git" ),
            workspace = process.env.WORKSPACE;

        if ( !workspace ) throwError( `"WORKSPACE" environment variable is not defined.` );

        const projects = ( await fs.promises.readdir( workspace, { "withFileTypes": true } ) )
            .filter( entry => entry.isDirectory() )
            .map( entry => workspace + "/" + entry.name )
            .filter( entry => isProjectRoot( entry ) );

        const stream = createStream( {
            "columns": {
                "0": {
                    "width": 50,
                },
                "1": {
                    "width": 9,
                },
            },
            "columnDefault": { "width": 30 },
            "columnCount": 2,
            "border": getBorderCharacters( "ramac" ),
        } );

        stream.write( [colors.bold.white( "NAME" ), colors.bold.white( "IS DIRTY" )] );

        for ( const root of projects ) {
            const pkg = require( root + "/package.json" ),
                git = new Git( root ),
                id = await git.getId();

            stream.write( [pkg.name, id.data.isDirty ? colors.bgRed.bold.white( " DIRTY " ) : colors.bold.white( "-" )] );
        }
    }
};
