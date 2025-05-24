import Markdown from "#core/markdown";
import SemanticVersion from "#core/semantic-version";
import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "changelog": {
                    "short": "c",
                    "description": "show changelog",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "release": {
                    "short": "r",
                    "description": "compare with the previous release",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
            },
            "arguments": {
                "commit": {
                    "description": "Show changelog for this commit",
                    "default": "HEAD",
                    "schema": {
                        "type": "string",
                    },
                },
            },
        };
    }

    // public
    async run () {
        const pkg = this._findGitRoot();
        if ( !pkg ) return result( [ 500, `Unable to find git root` ] );

        const git = pkg.git;

        var res, currentRelease, startCommit, endCommit;

        if ( SemanticVersion.isValid( process.cli.arguments.commit ) ) {
            endCommit = SemanticVersion.new( process.cli.arguments.commit ).versionString + "~1";
            currentRelease = endCommit;
        }
        else {
            endCommit = process.cli.arguments.commit;
        }

        // get end commit
        res = await git.getCommit( endCommit );
        if ( !res.ok ) return res;
        if ( !res.data ) return result( [ 400, "Commit not found" ] );

        endCommit = res.data.hash;

        // get current release
        res = await git.getCurrentRelease( {
            "commit": endCommit,
            "release": process.cli.options.release,
        } );
        if ( !res.ok ) return res;

        startCommit = res.data.version;

        currentRelease ??= startCommit;
        if ( currentRelease.isNull ) currentRelease = null;

        res = await git.getChanges( [ startCommit, endCommit ] );
        if ( !res.ok ) return res;
        const changes = res.data;

        // changelog
        if ( process.cli.options.changelog ) {
            const changelog = await changes.createChangeLog( {
                "previousVersion": currentRelease,
                "upstream": git.upstream,
            } );

            console.log( new Markdown( changelog ).toString( { "ansi": true } ).trim() );
        }

        // changes list
        else {
            if ( !currentRelease ) {
                console.log( "### Changes since the initial commit" );
            }
            else {
                console.log( "### Changes since the release: " + currentRelease.versionString );
            }

            if ( changes.hasChanges ) {
                console.log( "" );

                for ( const change of changes ) {
                    console.log( `- ${ change.getChangelogSubject() }` );
                }
            }

            console.log( "" );

            changes.printReport();
        }
    }
}
