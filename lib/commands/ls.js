import Command from "../command.js";
import { ansi, Table } from "#core/text";
import glob from "#core/glob";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "all": {
                    "short": "a",
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
                "pattern": {
                    "description": "filter projects, using pattern",
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        const userConfig = await this._getUserConfig();

        if ( !userConfig.workspace ) this._throwError( `No workspace configured.` );

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

        const projects = glob( "*/*/", {
            "cwd": userConfig.workspace,
            "dot": true,
            "sync": true,
        } );

        const table = new Table( {
            "console": true,
            "lazy": true,
            "columns": {
                "name": { "title": ansi.hl( "PROJECT" ), "headerAlign": "center" },
                "branch": { "title": ansi.hl( "BRANCH" ), "width": 15, "headerAlign": "center" },
                "dirty": { "title": ansi.hl( "IS DIRTY" ), "width": 10, "align": "center", "format": value => ( value ? ansi.error( " DIRTY " ) : "-" ) },
                "pushed": { "title": ansi.hl( "NOT\nPUSHED" ), "width": 8, "align": "right", "headerAlign": "center" },
                "last": { "title": ansi.hl( "LAST\nRELEASE" ), "width": 23, "align": "right", "headerAlign": "center" },
                "current": { "title": ansi.hl( "CURRENT\nRELEASE" ), "width": 23, "align": "right", "headerAlign": "center" },
                "unreleased": { "title": ansi.hl( "UNRELEASED\nCOMMITS" ), "width": 12, "align": "right", "headerAlign": "center" },
            },
        } );

        const pattern = process.cli.arguments?.pattern ? new RegExp( process.cli.arguments?.pattern, "i" ) : null;

        for ( let project of projects ) {
            project = project.substring( 0, project.length - 1 );

            // filter by pattern
            if ( pattern && !pattern.test( project ) ) continue;

            if ( !this._isRootPackageDir( userConfig.workspace + "/" + project ) ) continue;

            const rootPackage = this._findRootPackage( userConfig.workspace + "/" + project );

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
                "name": ( isPrivate ? ansi.error( " PRIV " ) : ansi.ok( "  PUB " ) ) + " " + this.#prepareName( project, rootPackage.name ),
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

    // private
    #prepareName ( project, name ) {
        const idx = project.indexOf( name );

        if ( idx === -1 ) {
            return project;
        }
        else {
            return project.substring( 0, idx ) + ansi.hl( name ) + project.substr( idx + name.length );
        }
    }

    #versionFormat ( version ) {
        if ( version.isNull ) return "-";

        // else if ( version.isPreRelease ) return ansi.hl( version );
        else return version;
    }
}
