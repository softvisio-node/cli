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
            if ( options.private && !pkg.isPrivate ) continue;
            if ( options.public && pkg.isPrivate ) continue;

            const git = pkg.git;

            res = await git.getStatus( {
                "branchStatus": true,
            } );
            if ( !res.ok ) {

                // repo has no commits
                if ( res.status === 404 ) {
                    continue;
                }

                // git error
                else {
                    return result( res );
                }
            }
            const status = res.data;

            const currentBranchPushStatus = status.branchStatus[ status.head.branch ]?.ahead
                ? `${ status.branchStatus[ status.head.branch ].ahead }`
                : null;

            const isDirty = status.isDirty || currentBranchPushStatus,
                isUnreleased = ( status.currentReleaseDistance || ( !status.head.branch && status.head.abbrev ) ) && pkg.isReleaseEnabled;

            // unreleased filter includes unreleased and dirty packages
            if ( options.unreleased && !( isUnreleased || isDirty ) ) continue;

            // dirty filter
            if ( options.dirty && !isDirty ) continue;

            table.add( {
                "name": ( pkg.isReleaseEnabled
                    ? ansi.ok( "R" )
                    : ansi.error( "R" ) ) + ( pkg.isPrivate
                    ? ansi.error( "P" )
                    : ansi.ok( "P" ) ) + " " + this.#prepareName( pkg ),
                "branch": status.head.branch
                    ? ( status.head.branch === "main"
                        ? status.head.branch
                        : ansi.error( status.head.branch ) )
                    : ansi.error( status.head.abbrev ),
                "dirty": status.isDirty,
                "pushed": currentBranchPushStatus
                    ? ansi.error( " " + currentBranchPushStatus + " " )
                    : "-",
                "last": this.#formatVersion( status.releases.lastRelease ),
                "current": this.#formatVersion( status.currentRelease ),
                "unreleased": pkg.isReleaseEnabled
                    ? ( status.currentReleaseDistance
                        ? ansi.error( " " + status.currentReleaseDistance + " " )
                        : "-" )
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
        if ( !version ) {
            return "-";
        }
        else if ( version.isPreRelease ) {
            return ansi.error( version );
        }
        else {
            return version;
        }
    }
}
