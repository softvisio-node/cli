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

        if ( process.cli.options.changelog ) {
            const changelog = await changes.data.createChangeLog( {
                "previousVersion": status.data.currentVersion,
                "upstream": git.upstream,
            } );

            console.log( new Markdown( changelog ).toString( { "ansi": true } ) );
        }
        else {
            for ( const change of changes.data ) {
                console.log( `- ${ change.subject }` );
            }

            if ( changes.data.size ) console.log( "" );

            changes.data.printReport();
        }
    }
}
