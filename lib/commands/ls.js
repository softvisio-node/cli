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
                "unreleased": {
                    "summary": `Show unreleased projects only, regardless to the "dirty" status.`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "dirty": {
                    "summary": `Show all projects regardless to the "dirty" status. "Dirty" project - project, that has uncommited or unpushed changes.`,
                    "default": true,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "workspace": {
                    "summary": "List project in named workspace only. Also you can use wokspace index: 1, 2, etc.",
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {
        const userConfig = this._getUserConfig();

        if ( !userConfig.workspaces || Object.isEmpty( userConfig.workspaces ) ) this._throwError( `No workspaces configured.` );

        const options = {
            "private": true,
            "public": true,
            "dirty": process.cli.options.dirty,
            "unreleased": process.cli.options.unreleased,
        };

        if ( process.cli.options.private && !process.cli.options.public ) {
            options.public = false;
        }
        else if ( !process.cli.options.private && process.cli.options.public ) {
            options.private = false;
        }

        // all workspaces
        if ( process.cli.options.all ) {
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

    async #lsWorkspace ( name, path, options ) {
        const fs = require( "fs" ),
            Table = require( "@softvisio/core/text/table" ),
            ansi = require( "@softvisio/core/ansi" );

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
                "latest": { "title": ansi.hl( "LATEST\nRELEASE" ), "width": 19, "align": "right", "headerAlign": "center" },
                "current": { "title": ansi.hl( "CURRENT\nRELEASE" ), "width": 19, "align": "right", "headerAlign": "center" },
                "unreleased": { "title": ansi.hl( "UNRELEASED\nCHANGES" ), "width": 12, "align": "right", "headerAlign": "center" },
            },
        } );

        for ( const root of projects ) {
            const rootPackage = this._findRootPackage( root );

            // public / private filter
            const isPrivate = rootPackage.isPrivate;
            if ( ( isPrivate && !options.private ) || ( !isPrivate && !options.public ) ) continue;

            const git = rootPackage.git,
                id = await git.getId(),
                currentBranchPushStatus = id.data.pushStatus[id.data.branch];

            const isUnreleased = ( id.data.currentRelease && id.data.currentReleaseDistance ) || ( !id.data.branch && id.data.hashShort ),
                isDirty = id.data.isDirty || currentBranchPushStatus;

            // "unreleased" filter
            if ( options.unreleased ) {
                if ( !isUnreleased ) continue;
            }

            // "dirty" filter
            else if ( options.dirty && !isDirty ) continue;

            table.add( {
                "name": ( isPrivate ? ansi.error( " PRIV " ) : ansi.ok( "  PUB " ) ) + " " + ansi.hl( rootPackage.name ),
                "branch": id.data.branch || ( id.data.hashShort ? "HEAD: " + ansi.error( id.data.hashShort ) : "" ),
                "dirty": id.data.isDirty,
                "pushed": currentBranchPushStatus ? ansi.error( " " + currentBranchPushStatus + " " ) : "-",
                "latest": id.data.latestRelease || "-",
                "current": id.data.currentRelease || "-",
                "unreleased": id.data.currentReleaseDistance ? ( id.data.currentRelease ? ansi.error( " " + id.data.currentReleaseDistance + " " ) : id.data.currentReleaseDistance ) : "-",
            } );
        }

        table.end();

        if ( !table.hasContent ) console.log( "No projects to show" );
    }
};
