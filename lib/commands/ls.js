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
            "arguments": {
                "workspace": {
                    "summary": "List project in nameed workspace only.",
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {
        const userConfig = this._getUserConfig();
        const { isEmptyObject } = require( "@softvisio/core/util" );

        if ( !userConfig.workspaces || isEmptyObject( userConfig.workspaces ) ) this._throwError( `No workspaces configured.` );

        if ( process.cli.arguments.workspace ) {
            if ( !userConfig.workspaces[process.cli.arguments.workspace] ) {
                this._throwError( `Unknown workspace "${process.cli.arguments.workspace}".` );
            }

            await this._lsWorkspace( process.cli.arguments.workspace, userConfig.workspaces[process.cli.arguments.workspace] );
        }
        else if ( process.cli.options.all ) {
            for ( const workspace in userConfig.workspaces ) {
                await this._lsWorkspace( workspace, userConfig.workspaces[workspace] );
            }
        }
        else {

            // get first worksace
            const workspace = Object.keys( userConfig.workspaces )[0];

            await this._lsWorkspace( workspace, userConfig.workspaces[workspace] );
        }
    }

    async _lsWorkspace ( name, path ) {
        const fs = require( "fs" ),
            { createStream, getBorderCharacters } = require( "table" ),
            ansi = require( "@softvisio/core/ansi" );

        const projects = fs
            .readdirSync( path, { "withFileTypes": true } )
            .filter( entry => entry.isDirectory() )
            .map( entry => path + "/" + entry.name )
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
            ansi.hl( "NAME" ),
            ansi.hl( "BRANCH" ),
            ansi.hl( "IS DIRTY" ),
            ansi.hl( "NOT\nPUSHED" ),
            ansi.hl( "LATEST\nRELEASE" ),
            ansi.hl( "CURRENT\nRELEASE" ),
            ansi.hl( "UNRELEASED\nCHANGES" ),
        ] );

        for ( const root of projects ) {
            const pkg = require( root + "/package.json" ),
                git = this._getGit( root ),
                id = await git.getId(),
                currentBranchPushStatus = id.data.pushStatus[id.data.branch];

            stream.write( [

                //
                ( pkg.private ? ansi.error( " PRIV " ) : ansi.ok( "  PUB " ) ) + " " + ansi.hl( pkg.name ),
                id.data.branch,
                id.data.isDirty ? ansi.error( " DIRTY " ) : "-",
                currentBranchPushStatus ? ansi.error( " " + currentBranchPushStatus + " " ) : "-",
                id.data.latestRelease || "-",
                id.data.currentRelease || "-",
                id.data.currentReleaseDistance ? ( id.data.currentRelease ? ansi.error( " " + id.data.currentReleaseDistance + " " ) : id.data.currentReleaseDistance ) : "-",
            ] );
        }

        console.log( "\n" );
    }
};
