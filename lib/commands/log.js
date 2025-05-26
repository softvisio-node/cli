import Markdown from "#core/markdown";
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
                "stable": {
                    "short": "s",
                    "description": "compare with the previous stable release",
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

        var res;

        // get release
        res = await git.getRelease( {
            "commit": process.cli.arguments.commit,
            "stable": process.cli.options.stable,
        } );
        if ( !res.ok ) return res;

        const previousRelease = res.data.previousVersion,
            currentRelease = res.data.version;

        // get changes
        res = await git.getChanges( [ previousRelease, currentRelease
            ? currentRelease.versionString + "~1"
            : null ] );
        if ( !res.ok ) return res;
        const changes = res.data;

        // create changelog
        if ( process.cli.options.changelog ) {
            const changelog = await changes.createChangeLog( {
                "previousVersion": currentRelease,
                "upstream": git.upstream,
            } );

            console.log( new Markdown( changelog ).toString( { "ansi": true } ).trim() );
        }

        // create changes list
        else {
            if ( previousRelease && currentRelease ) {
                console.log( `### Changes between the releases: ${ previousRelease.versionString }..${ currentRelease.versionString }` );
            }
            else if ( !previousRelease && currentRelease ) {
                console.log( `### Changes for the release: ${ currentRelease.versionString }` );
            }
            else if ( previousRelease && !currentRelease ) {
                console.log( `### Changes since the release: ${ previousRelease.versionString }` );
            }
            else {
                console.log( `### Changes since the initial commit` );
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
