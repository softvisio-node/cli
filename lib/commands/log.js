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
            },
        };
    }

    // public
    async run () {
        const pkg = this._findGitRoot();
        if ( !pkg ) return result( [ 500, `Unable to find git root` ] );

        const git = pkg.git;

        const status = await git.getStatus( { "pushStatus": false, "releases": false } );
        if ( !status.ok ) return status;

        const changes = await git.getChanges( status.data.currentVersion );
        if ( !changes.ok ) return changes;

        // changelog
        if ( process.cli.options.changelog ) {
            const changelog = await changes.data.createChangeLog( {
                "previousVersion": status.data.currentVersion,
                "upstream": git.upstream,
            } );

            console.log( new Markdown( changelog ).toString( { "ansi": true } ).trim() );
        }

        // changes list
        else {
            if ( status.data.currentVersion.isNull ) {
                console.log( "### Changes since the initial commit" );
            }
            else {
                console.log( "### Changes since the release: " + status.data.currentVersion.toVersionString() );
            }

            if ( changes.data.size ) console.log( "" );

            for ( const change of changes.data ) {
                console.log( `- ${ change.subject }` );
            }

            if ( changes.data.size ) console.log( "" );

            changes.data.printReport();
        }
    }
}
