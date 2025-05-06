import { ansi, Table } from "#core/text";
import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "description": `By default it shows dirty (not commited or not pushed) packages. You can specify additional filters using command line options.`,
            "options": {
                "unreleased": {
                    "short": "a",
                    "description": `show dirty and unreleased packages`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "private": {
                    "short": "p",
                    "description": "show private packages only",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "public": {
                    "short": "P",
                    "description": "show public packages only",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "pattern": {
                    "description": `Filter packages using glob patterns.`,
                    "schema": { "type": "array", "items": { "type": "string" } },
                },
            },
        };
    }

    // public
    async run () {
        var res = this._findWorkspacePackages( {
            "git": true,
            "package": false,
            "patterns": process.cli.arguments?.pattern,
        } );
        if ( !res.ok ) return res;

        const packages = res.data;

        const options = {
            "dirty": !process.cli.arguments?.pattern && !process.cli.options.unreleased
                ? true
                : null,
            "unreleased": process.cli.options.unreleased,
            "private": process.cli.options.private,
            "public": process.cli.options.public,
        };

        const table = new Table( {
            "columns": {
                "name": { "title": ansi.hl( "PACKAGE" ), "headerAlign": "center", "headerValign": "end" },
                "branch": { "title": ansi.hl( "BRANCH" ), "width": 15, "headerAlign": "center", "headerValign": "end" },
                "dirty": { "title": ansi.hl( "IS\nDIRTY" ), "width": 7, "align": "center", "format": value => ( value
                    ? ansi.error( " DIRTY " )
                    : "-" ) },
                "pushed": { "title": ansi.hl( "NOT\nPUSHED" ), "width": 8, "align": "end", "headerAlign": "center" },
                "last": { "title": ansi.hl( "LAST\nRELEASE" ), "width": 20, "align": "end", "headerAlign": "center" },
                "current": { "title": ansi.hl( "CURRENT\nRELEASE" ), "width": 20, "align": "end", "headerAlign": "center" },
                "unreleased": { "title": ansi.hl( "UNRELEASED\nCOMMITS" ), "width": 12, "align": "end", "headerAlign": "center" },
            },
        } ).pipe( process.stdout );

        for ( const pkg of packages ) {

            // public / private filter
            const isReleasable = pkg.cliConfig?.releasable,
                isPrivate = pkg.isPrivate;

            if ( options.private && !isPrivate ) continue;
            if ( options.public && isPrivate ) continue;

            const git = pkg.git;

            let status = await git.getStatus();
            if ( !status.ok ) return result( [ 500, `Git error: ` + status ] );
            status = status.data;

            const currentBranchPushStatus = status.pushStatus[ status.branch ]?.ahead
                ? `${ status.pushStatus[ status.branch ].ahead }`
                : null;

            const isDirty = status.isDirty || currentBranchPushStatus,
                isUnreleased = ( !status.currentVersion.isNull && status.currentVersionDistance ) || ( !status.branch && status.abbrev );

            // unreleased filter includes unreleased and dirty packages
            if ( options.unreleased && !( isUnreleased || isDirty ) ) continue;

            // dirty filter
            if ( options.dirty && !isDirty ) continue;

            table.add( {
                "name": ( isReleasable
                    ? ansi.ok( "R" )
                    : ansi.error( "R" ) ) + ( isPrivate
                    ? ansi.error( "P" )
                    : ansi.ok( "P" ) ) + " " + this.#prepareName( pkg ),
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
    }

    // private
    #prepareName ( pkg ) {
        const [ owner, name ] = pkg.workspaceSlug.split( "/" );

        return ansi.dim( owner + "/" ) + ansi.hl( name );
    }

    #formatVersion ( version ) {
        if ( version.isNull ) return "-";

        // else if ( version.isPreRelease ) return ansi.hl( version );
        else return version;
    }
}
