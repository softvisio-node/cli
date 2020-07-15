const Command = require( "../command" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "List projects in workspace.",
            "options": {
                "all": {
                    "summary": "List projects in all workspaces.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    async run () {
        const userConfig = this._getUserConfig();

        if ( !userConfig.workspaces || !userConfig.workspaces[0] ) this._throwError( `No workspaces configured.` );

        if ( process.cli.options.all ) {
            for ( const workspace of userConfig.workspaces ) {
                await this._lsWorkspace( workspace );
            }
        }
        else {
            await this._lsWorkspace( userConfig.workspaces[0] );
        }
    }

    async _lsWorkspace ( workspace ) {
        const fs = require( "fs" ),
            { createStream, getBorderCharacters } = require( "table" ),
            colors = require( "ansi-colors" );

        colors.theme( {
            "header": colors.bold.white,
            "warn": colors.bgRed.bold.white,
        } );

        if ( !workspace ) this._throwError( `"WORKSPACE" environment variable is not defined.` );

        const projects = fs
            .readdirSync( workspace, { "withFileTypes": true } )
            .filter( entry => entry.isDirectory() )
            .map( entry => workspace + "/" + entry.name )
            .filter( entry => this._isProjectRoot( entry ) );

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
                git = this._getGit( root ),
                id = await git.getId(),
                pushStatus = ( await git.getPushStatus() ).data[id.data.branch],
                releases = Object.keys( ( await git.getReleases() ).data )[0];

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

        console.log( "\n" );
    }
};
