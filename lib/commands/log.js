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
                "release": {
                    "short": "r",
                    "description": "compare with the previous release",
                    "default": false,
                    "schema": {
                        "type": "boolean",
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

        const release = await git.getCurrentRelease( {
            "release": process.cli.options.release,
        } );
        if ( !release.ok ) return release;

        const changes = await git.getChanges( release.data.version );
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
