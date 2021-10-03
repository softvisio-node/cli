import Command from "../command.js";
import { ansi, Table } from "#core/text";
import glob from "#core/glob";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "unreleased": {
                    "description": `show unreleased projects only`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "private": {
                    "short": "p",
                    "description": "show private projects only",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "public": {
                    "short": "P",
                    "description": "show public projects only",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "pattern": {
                    "description": `Filter projects using pattern. Use "." to show all projects.`,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        const userConfig = await this._getUserConfig();

        if ( !userConfig.workspace ) this._throwError( `No workspace configured.` );

        const pattern = process.cli.arguments?.pattern ? new RegExp( process.cli.arguments?.pattern, "i" ) : null;

        const options = {
            "dirty": !pattern && !process.cli.options.unreleased ? true : null,
            "unreleased": process.cli.options.unreleased,
            "private": process.cli.options.private,
            "public": process.cli.options.public,
        };

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
                "dirty": { "title": ansi.hl( "IS\nDIRTY" ), "width": 7, "align": "center", "format": value => ( value ? ansi.error( " DIRTY " ) : "-" ) },
                "pushed": { "title": ansi.hl( "NOT\nPUSHED" ), "width": 8, "align": "right", "headerAlign": "center" },
                "last": { "title": ansi.hl( "LAST\nRELEASE" ), "width": 20, "align": "right", "headerAlign": "center" },
                "current": { "title": ansi.hl( "CURRENT\nRELEASE" ), "width": 20, "align": "right", "headerAlign": "center" },
                "unreleased": { "title": ansi.hl( "UNRELEASED\nCOMMITS" ), "width": 12, "align": "right", "headerAlign": "center" },
            },
        } );

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

            // unreleased filter includes unreleased and dirty projects
            if ( options.unreleased && !( isUnreleased || isDirty ) ) continue;

            // dirty filter
            if ( options.dirty && !isDirty ) continue;

            table.add( {
                "name": ( isPrivate ? ansi.error( " PRV " ) : ansi.ok( " PUB " ) ) + " " + this.#prepareName( project, rootPackage.name ),
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
    #prepareName ( pathName, packageName ) {
        const idx = pathName.indexOf( "/" );

        const owner = pathName.substring( 0, idx ),
            name = pathName.substr( idx + 1 );

        if ( packageName && packageName.startsWith( owner + "/" ) ) {
            return owner + "/" + ansi.hl( name );
        }
        else {
            return ansi.dim( owner + "/" ) + ansi.hl( name );
        }
    }

    #versionFormat ( version ) {
        if ( version.isNull ) return "-";

        // else if ( version.isPreRelease ) return ansi.hl( version );
        else return version;
    }
}
