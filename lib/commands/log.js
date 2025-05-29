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
                "release": {
                    "description": "Show changelog for the specified release. Can be a branch name or a semantic version tag name.",
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

        // get changelog
        res = await git.getChangelog( {
            "commit": process.cli.arguments.release,
            "stable": process.cli.options.stable,
        } );
        if ( !res.ok ) return res;

        const changelog = res.data;

        // print changelog
        if ( process.cli.options.changelog ) {
            console.log( await changelog.createChangelog( { "text": true } ) );
        }

        // print changes list
        else {
            console.log( changelog.createChangesList() );
        }

        // print report
        console.log( "" );
        console.log( changelog.createReport() );
    }
}
