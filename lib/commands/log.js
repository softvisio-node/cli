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

        // get changelog
        res = await git.getChangelog( {
            "commit": process.cli.arguments.commit,
            "stable": process.cli.options.stable,
        } );
        if ( !res.ok ) return res;

        const changelog = res.data;

        if ( process.cli.options.changelog ) {
            console.log( await changelog.createChangelog( { "markdown": true } ) );
        }
        else {
            console.log( changelog.createChangesList() );
        }

        console.log( "" );

        console.log( changelog.createReport() );
    }
}
