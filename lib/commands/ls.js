import Command from "../command.js";
import { objectIsEmpty } from "#core/utils";
import { ansi, Table } from "#core/text";
import fs from "fs";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "all-workspaces": {
                    "short": "a",
                    "description": "list projects in all workspaces",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "all": {
                    "short": "A",
                    "description": "show all projects",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "unreleased": {
                    "description": `show unreleased projects only`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "private": {
                    "short": "P",
                    "description": "show private projects only",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "public": {
                    "short": "p",
                    "description": "show public projects only",
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

    // public
    async run () {
        const userConfig = await this._getUserConfig();

        if ( !userConfig.workspaces || objectIsEmpty( userConfig.workspaces ) ) this._throwError( `No workspaces configured.` );

        const options = {
            "dirty": true,
            "unreleased": false,
            "private": false,
            "public": false,
        };

        // all, disable all filters
        if ( process.cli.options.all ) {
            options.dirty = false;
            options.unreleased = false;
            options.private = false;
            options.public = false;
        }
        else {
            if ( process.cli.options.unreleased ) options.unreleased = true;

            if ( process.cli.options.private ) options.private = true;
            if ( process.cli.options.public ) options.public = true;
        }

        // all workspaces
        if ( process.cli.options["all-workspaces"] ) {
            const workspaces = Object.keys( userConfig.workspaces );

            for ( const [idx, workspace] of workspaces.entries() ) {
                await this.#lsWorkspace( workspace, userConfig.workspaces[workspace], options );

                if ( idx + 1 !== workspaces.length ) console.log( "" );
            }
        }

        // namead workspace
        else if ( process.cli.arguments.workspace ) {

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

        // default workspace
        else {
            const workspace = Object.keys( userConfig.workspaces )[0];

            await this.#lsWorkspace( workspace, userConfig.workspaces[workspace], options );
        }
    }

    // private
    async #lsWorkspace ( name, path, options ) {
        const projects = fs
            .readdirSync( path, { "withFileTypes": true } )
            .filter( entry => entry.isDirectory() )
            .map( entry => path + "/" + entry.name )
            .filter( entry => this._isRootPackageDir( entry ) )
            .map( root => this._findRootPackage( root ) )
            .sort( ( a, b ) => ( a.name.includes( "/" ) ? a.name : " /" + a.name ).localeCompare( b.name.includes( "/" ) ? b.name : " /" + b.name ) );

        console.log( `"` + ansi.hl( name.toUpperCase() ) + `" workspace: ${projects.length} projects` );

        const table = new Table( {
            "console": true,
            "lazy": true,
            "columns": {
                "name": { "title": ansi.hl( "PROJECT NAME" ), "headerAlign": "center" },
                "branch": { "title": ansi.hl( "BRANCH" ), "width": 15, "headerAlign": "center" },
                "dirty": { "title": ansi.hl( "IS DIRTY" ), "width": 10, "align": "center", "format": value => ( value ? ansi.error( " DIRTY " ) : "-" ) },
                "pushed": { "title": ansi.hl( "NOT\nPUSHED" ), "width": 8, "align": "right", "headerAlign": "center" },
                "last": { "title": ansi.hl( "LAST\nRELEASE" ), "width": 23, "align": "right", "headerAlign": "center" },
                "current": { "title": ansi.hl( "CURRENT\nRELEASE" ), "width": 23, "align": "right", "headerAlign": "center" },
                "unreleased": { "title": ansi.hl( "UNRELEASED\nCOMMITS" ), "width": 12, "align": "right", "headerAlign": "center" },
            },
        } );

        for ( const rootPackage of projects ) {

            // public / private filter
            const isPrivate = rootPackage.isPrivate;

            if ( options.private && !isPrivate ) continue;
            if ( options.public && isPrivate ) continue;

            const git = rootPackage.git,
                status = ( await git.getStatus() ).data,
                currentBranchPushStatus = status.pushStatus[status.branch];

            const isDirty = status.isDirty || currentBranchPushStatus,
                isUnreleased = ( !status.currentVersion.isNull && status.currentVersionDistance ) || ( !status.branch && status.abbrev );

            if ( options.dirty || options.unreleased ) {
                let show = false;

                // "dirty" filter
                if ( options.dirty && isDirty ) show = true;

                // "unreleased" filter
                if ( options.unreleased && isUnreleased ) show = true;

                if ( !show ) continue;
            }

            table.add( {
                "name": ( isPrivate ? ansi.error( " PRIV " ) : ansi.ok( "  PUB " ) ) + " " + ansi.hl( rootPackage.name ),
                "branch": status.branch || ( status.abbrev ? "HEAD: " + ansi.error( status.abbrev ) : "" ),
                "dirty": status.isDirty,
                "pushed": currentBranchPushStatus ? ansi.error( " " + currentBranchPushStatus + " " ) : "-",
                "last": this.#versionFormat( status.releases.lastVersion ),
                "current": this.#versionFormat( status.currentVersion ),
                "unreleased": status.currentVersionDistance ? ( !status.currentVersion.isNull ? ansi.error( " " + status.currentVersionDistance + " " ) : status.currentVersionDistance ) : "-",
            } );
        }

        table.end();

        if ( !table.hasContent ) console.log( "No projects to show" );
    }

    #versionFormat ( version ) {
        if ( version.isNull ) return "-";

        // else if ( version.isPreRelease ) return ansi.hl( version );
        else return version;
    }
}
