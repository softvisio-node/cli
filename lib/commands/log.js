import Markdown from "#core/markdown";
import Semver from "#core/semver";
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

        var currentRelease, releaseCommit;

        if ( Semver.isValid( process.cli.arguments.commit ) ) {
            currentRelease = Semver.new( process.cli.arguments.commit );

            if ( currentRelease.isNull ) {
                currentRelease = null;
            }
            else {
                releaseCommit = currentRelease.versionString + "~1";
            }
        }
        else {
            releaseCommit = process.cli.arguments.commit;
        }

        const release = await git.getCurrentRelease( {
            "commit": releaseCommit,
            "release": process.cli.options.release,
        } );
        if ( !release.ok ) return release;

        // const previousRelease = release.data.version.isNull
        //     ? null
        //     : release.data.version;

        const startCommit = release.data.version;

        const changes = await git.getChanges( {
            startCommit,

            // endCommit,
        } );
        if ( !changes.ok ) return changes;

        // changelog
        if ( process.cli.options.changelog ) {
            const changelog = await changes.data.createChangeLog( {
                "previousVersion": release.data.version,
                "upstream": git.upstream,
            } );

            console.log( new Markdown( changelog ).toString( { "ansi": true } ).trim() );
        }

        // changes list
        else {
            if ( release.data.version.isNull ) {
                console.log( "### Changes since the initial commit" );
            }
            else {
                console.log( "### Changes since the release: " + release.data.version.versionString );
            }

            if ( changes.data.size ) console.log( "" );

            for ( const change of changes.data ) {
                console.log( `- ${ change.getChangelogSubject() }` );
            }

            if ( changes.data.size ) console.log( "" );

            changes.data.printReport();
        }
    }
}
