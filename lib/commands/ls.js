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
                "private": {
                    "short": "P",
                    "summary": "List private projects only.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "public": {
                    "short": "p",
                    "summary": "List public projects only.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "workspace": {
                    "summary": "List project in nameed workspace only. Also you can use wokspace index: 1, 2, etc.",
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {
        const userConfig = this._getUserConfig();
        const { isEmptyObject } = require( "@softvisio/core/util" );

        if ( !userConfig.workspaces || isEmptyObject( userConfig.workspaces ) ) this._throwError( `No workspaces configured.` );

        const options = {
            "private": true,
            "public": true,
        };

        if ( process.cli.options.private && !process.cli.options.public ) {
            options.public = false;
        }
        else if ( !process.cli.options.private && process.cli.options.public ) {
            options.private = false;
        }

        if ( process.cli.arguments.workspace ) {

            // numeric workspace
            if ( !isNaN( process.cli.arguments.workspace ) ) {
                const workspaces = Object.keys( userConfig.workspaces );

                const idx = process.cli.arguments.workspace - 1;

                const name = workspaces[idx];

                if ( !name ) {
                    this._throwError( `Workspace with index "${process.cli.arguments.workspace}" is not defined.` );
                }

                await this._lsWorkspace( name, userConfig.workspaces[name], options );
            }

            // string workspace
            else {
                if ( !userConfig.workspaces[process.cli.arguments.workspace] ) {
                    this._throwError( `Unknown workspace "${process.cli.arguments.workspace}".` );
                }

                await this._lsWorkspace( process.cli.arguments.workspace, userConfig.workspaces[process.cli.arguments.workspace], options );
            }
        }
        else if ( process.cli.options.all ) {
            for ( const workspace in userConfig.workspaces ) {
                await this._lsWorkspace( workspace, userConfig.workspaces[workspace], options );
            }
        }
        else {

            // get first worksace
            const workspace = Object.keys( userConfig.workspaces )[0];

            await this._lsWorkspace( workspace, userConfig.workspaces[workspace], options );
        }
    }

    async _lsWorkspace ( name, path, options ) {
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

        console.log( `"` + ansi.hl( name.toUpperCase() ) + `" workspace:` );

        stream.write( [

            //
            ansi.hl( "PROJECT NAME" ),
            ansi.hl( "BRANCH" ),
            ansi.hl( "IS DIRTY" ),
            ansi.hl( "NOT\nPUSHED" ),
            ansi.hl( "LATEST\nRELEASE" ),
            ansi.hl( "CURRENT\nRELEASE" ),
            ansi.hl( "UNRELEASED\nCHANGES" ),
        ] );

        for ( const root of projects ) {
            const pkg = require( root + "/package.json" );

            if ( ( pkg.private && !options.private ) || ( !pkg.private && !options.public ) ) continue;

            const git = this._getGit( root ),
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
