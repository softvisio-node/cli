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

        colors.theme( {
            "header": colors.bold.white,
            "warn": colors.bgRed.bold.white,
        } );

        if ( !workspace ) throwError( `"WORKSPACE" environment variable is not defined.` );

        const projects = ( await fs.promises.readdir( workspace, { "withFileTypes": true } ) )
            .filter( entry => entry.isDirectory() )
            .map( entry => workspace + "/" + entry.name )
            .filter( entry => isProjectRoot( entry ) );

        const stream = createStream( {
            "columns": {
                "0": {
                    "width": 40,
                },
                "1": {
                    "width": 15,
                },
                "2": {
                    "width": 8,
                },
                "3": {
                    "width": 6,
                },
                "4": {
                    "width": 10,
                },
                "5": {
                    "width": 10,
                },
                "6": {
                    "width": 10,
                },
            },
            "columnDefault": { "width": 30 },
            "columnCount": 7,
            "border": getBorderCharacters( "ramac" ),
        } );

        stream.write( [

            //
            colors.bold.white( "NAME" ),
            colors.header( "BRANCH" ),
            colors.header( "IS DIRTY" ),
            colors.header( "NOT\nPUSHED" ),
            colors.header( "LATEST\nRELEASE" ),
            colors.header( "CURRENT\nRELEASE" ),
            colors.header( "UNRELEASED\nCHANGES" ),
        ] );

        for ( const root of projects ) {
            const pkg = require( root + "/package.json" ),
                git = new Git( root ),
                id = await git.getId(),
                pushStatus = ( await git.getPushStatus() ).data[id.data.branch],
                releases = Object.keys( ( await git.getReleases() ).data ).reverse()[0];

            stream.write( [

                //
                pkg.name,
                id.data.branch,
                id.data.isDirty ? colors.warn( " DIRTY " ) : "-",
                pushStatus ? colors.warn( " " + pushStatus + " " ) : "-",
                releases || "-",
                id.data.release || "-",
                id.data.releaseDistance ? colors.warn( " " + id.data.releaseDistance + " " ) : "-",
            ] );
        }
    }
};
