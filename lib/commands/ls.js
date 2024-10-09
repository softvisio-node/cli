import glob from "#core/glob";
import { ansi, Table } from "#core/text";
import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "description": `By default it shows dirty (not commited or not pushed) projects. You can specify additional filters using command line options.`,
            "options": {
                "unreleased": {
                    "short": "a",
                    "description": `show dirty and unreleased projects`,
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
        const workspace = process.env[ "SOFTVISIO_CLI_WORKSPACE_" + process.platform ];

        if ( !workspace ) return result( [ 500, `No workspace configured` ] );

        try {
            var pattern = process.cli.arguments?.pattern
                ? new RegExp( process.cli.arguments?.pattern, "i" )
                : null;
        }
        catch ( e ) {
            console.log( `Pattern is invalid.`, e + "" );

            process.exit( 1 );
        }

        const options = {
            "dirty": !pattern && !process.cli.options.unreleased
                ? true
                : null,
            "unreleased": process.cli.options.unreleased,
            "private": process.cli.options.private,
            "public": process.cli.options.public,
        };

        const projects = glob( "*/*", {
            "cwd": workspace,
            "files": false,
            "directories": true,
        } );

        const table = new Table( {
            "console": true,
            "lazy": true,
            "columns": {
                "name": { "title": ansi.hl( "PROJECT" ), "headerAlign": "center", "headerValign": "bottom" },
                "branch": { "title": ansi.hl( "BRANCH" ), "width": 15, "headerAlign": "center", "headerValign": "bottom" },
                "dirty": { "title": ansi.hl( "IS\nDIRTY" ), "width": 7, "align": "center", "format": value => ( value
                    ? ansi.error( " DIRTY " )
                    : "-" ) },
                "pushed": { "title": ansi.hl( "NOT\nPUSHED" ), "width": 8, "align": "right", "headerAlign": "center" },
                "last": { "title": ansi.hl( "LAST\nRELEASE" ), "width": 20, "align": "right", "headerAlign": "center" },
                "current": { "title": ansi.hl( "CURRENT\nRELEASE" ), "width": 20, "align": "right", "headerAlign": "center" },
                "unreleased": { "title": ansi.hl( "UNRELEASED\nCOMMITS" ), "width": 12, "align": "right", "headerAlign": "center" },
            },
        } );

        for ( const project of projects ) {

            // filter by pattern
            if ( pattern && !pattern.test( project ) ) continue;

            if ( !this._isGitPackageRoot( workspace + "/" + project ) ) continue;

            const pkg = this._findGitPackage( workspace + "/" + project );

            // public / private filter
            const isPrivate = pkg.isPrivate;

            if ( options.private && !isPrivate ) continue;
            if ( options.public && isPrivate ) continue;

            const git = pkg.git;

            let status = await git.getStatus();
            if ( !status.ok ) return result( [ 500, `Git error: ` + status ] );
            status = status.data;

            const currentBranchPushStatus = status.pushStatus[ status.branch ]?.ahead || status.pushStatus[ status.branch ]?.behind
                ? `${ status.pushStatus[ status.branch ].ahead }/${ status.pushStatus[ status.branch ].behind }`
                : null;

            const isDirty = status.isDirty || currentBranchPushStatus,
                isUnreleased = ( !status.currentVersion.isNull && status.currentVersionDistance ) || ( !status.branch && status.abbrev );

            // unreleased filter includes unreleased and dirty projects
            if ( options.unreleased && !( isUnreleased || isDirty ) ) continue;

            // dirty filter
            if ( options.dirty && !isDirty ) continue;

            table.add( {
                "name": ( isPrivate
                    ? ansi.error( " PRV " )
                    : ansi.ok( " PUB " ) ) + " " + this.#prepareName( project ),
                "branch": status.branch || ( status.abbrev
                    ? "HEAD: " + ansi.error( status.abbrev )
                    : "" ),
                "dirty": status.isDirty,
                "pushed": currentBranchPushStatus
                    ? ansi.error( " " + currentBranchPushStatus + " " )
                    : "-",
                "last": this.#formatVersion( status.releases.lastVersion ),
                "current": this.#formatVersion( status.currentVersion ),
                "unreleased": status.currentVersionDistance
                    ? ( !status.currentVersion.isNull
                        ? ansi.error( " " + status.currentVersionDistance + " " )
                        : status.currentVersionDistance )
                    : "-",
            } );
        }

        table.end();

        if ( !table.hasContent ) console.log( "No projects to show" );
    }

    // private
    #prepareName ( pathName ) {
        const [ owner, name ] = pathName.split( "/" );

        return ansi.dim( owner + "/" ) + ansi.hl( name );
    }

    #formatVersion ( version ) {
        if ( version.isNull ) return "-";

        // else if ( version.isPreRelease ) return ansi.hl( version );
        else return version;
    }
}
