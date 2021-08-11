import Command from "../command.js";
import { objectIsEmpty } from "#core/utils";

export default class extends Command {
    static cli () {
        return {
            "options": {
                "all": {
                    "description": "list all projects",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "workspace": {
                    "description": "List project in named workspace only. Also you can use wokspace index: 1, 2, etc.",
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {
        const userConfig = await this._getUserConfig();

        if ( !userConfig.workspaces || objectIsEmpty( userConfig.workspaces ) ) this._throwError( `No workspaces configured.` );

        const options = {
            "all": process.cli.options.all,
        };

        // namead workspace
        if ( process.cli.arguments.workspace ) {

            // named by index
            if ( !isNaN( process.cli.arguments.workspace ) ) {
                const workspaces = Object.keys( userConfig.workspaces );

                const idx = process.cli.arguments.workspace - 1;

                const name = workspaces[idx];

                // workspace not found
                if ( !name ) {
                    this._throwError( `Workspace with index "${process.cli.arguments.workspace}" is not defined.` );
                }

                await this.#lsWorkspace( name, userConfig.workspaces[name], options );
            }

            // named by name
            else {

                // workspace not found
                if ( !userConfig.workspaces[process.cli.arguments.workspace] ) {
                    this._throwError( `Unknown workspace "${process.cli.arguments.workspace}".` );
                }

                await this.#lsWorkspace( process.cli.arguments.workspace, userConfig.workspaces[process.cli.arguments.workspace], options );
            }
        }

        // all workspaces
        else {
            const workspaces = Object.keys( userConfig.workspaces );

            for ( const [idx, workspace] of workspaces.entries() ) {
                await this.#lsWorkspace( workspace, userConfig.workspaces[workspace], options );

                if ( idx + 1 !== workspaces.length ) console.log( "" );
            }
        }
    }

    async #lsWorkspace ( name, path, options ) {
        const fs = await import( "fs" ),
            { ansi, Table } = await import( "#core/text" );

        const projects = fs
            .readdirSync( path, { "withFileTypes": true } )
            .filter( entry => entry.isDirectory() )
            .map( entry => path + "/" + entry.name )
            .filter( entry => this._isRootPackageDir( entry ) );

        console.log( `"` + ansi.hl( name.toUpperCase() ) + `" workspace: ${projects.length} projects` );

        const table = new Table( {
            "console": true,
            "lazy": true,
            "columns": {
                "name": { "title": ansi.hl( "PROJECT NAME" ), "headerAlign": "center" },
                "branch": { "title": ansi.hl( "BRANCH" ), "width": 15, "headerAlign": "center" },
                "dirty": { "title": ansi.hl( "IS DIRTY" ), "width": 10, "align": "center", "format": value => ( value ? ansi.error( " DIRTY " ) : "-" ) },
                "pushed": { "title": ansi.hl( "NOT\nPUSHED" ), "width": 8, "align": "right", "headerAlign": "center" },
                "last": { "title": ansi.hl( "LAST\nVERSION" ), "width": 23, "align": "right", "headerAlign": "center" },
                "current": { "title": ansi.hl( "CURRENT\nVERSION" ), "width": 23, "align": "right", "headerAlign": "center" },
                "unreleased": { "title": ansi.hl( "UNRELEASED\nCHANGES" ), "width": 12, "align": "right", "headerAlign": "center" },
            },
        } );

        for ( const root of projects ) {
            const rootPackage = this._findRootPackage( root );

            // public / private filter
            const isPrivate = rootPackage.isPrivate;

            const git = rootPackage.git,
                id = ( await git.getId() ).data,
                currentBranchPushStatus = id.pushStatus[id.branch];

            // const isUnreleased = ( !id.currentVersion.isNull && id.currentVersionDistance ) || ( !id.branch && id.hashShort );
            const isDirty = id.isDirty || currentBranchPushStatus;

            // "dirty" filter
            if ( !options.all && !isDirty ) continue;

            table.add( {
                "name": ( isPrivate ? ansi.error( " PRIV " ) : ansi.ok( "  PUB " ) ) + " " + ansi.hl( rootPackage.name ),
                "branch": id.branch || ( id.hashShort ? "HEAD: " + ansi.error( id.hashShort ) : "" ),
                "dirty": id.isDirty,
                "pushed": currentBranchPushStatus ? ansi.error( " " + currentBranchPushStatus + " " ) : "-",
                "last": await this.#versionFormat( id.lastVersion ),
                "current": await this.#versionFormat( id.currentVersion ),
                "unreleased": id.currentVersionDistance ? ( !id.currentVersion.isNull ? ansi.error( " " + id.currentVersionDistance + " " ) : id.currentVersionDistance ) : "-",
            } );
        }

        table.end();

        if ( !table.hasContent ) console.log( "No projects to show" );
    }

    async #versionFormat ( version ) {
        const { ansi } = await import( "#core/text" );

        if ( version.isNull ) return "-";
        else if ( version.isPreRelease ) return ansi.error( " * " ) + " " + version;
        else return version;
    }
}
