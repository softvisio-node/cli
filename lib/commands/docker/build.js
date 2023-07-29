import Command from "#lib/command";
import DockerBuilder from "#core/api/docker/builder";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "remove": {
                    "description": "remove images after build and push",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "push": {
                    "description": "do not push images",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
                "force": {
                    "description": `answer "YES" on all questions`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "arg": {
                    "short": "a",
                    "description": "docker build arg",
                    "schema": {
                        "type": "array",
                        "item": { "type": "string" },
                    },
                },
            },
            "arguments": {
                "tag": {
                    "description": "git branch, tag or hash. If not specified current branch name will be used",
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( "Unable to find root package" );

        const abortcontroller = new abortcontroller(),
            signal = abortcontroller.signal;

        const builder = new DockerBuilder( rootPackage.root, {
            signal,
            "tag": process.cli.arguments.tag,
            "push": process.cli.options.push,
            "remove": process.cli.options.remove,
            "force": process.cli.options.force,
            "args": process.cli.options.arg,
        } );

        const res = await builder.run();

        if ( !res.ok ) this._exitOnError();
    }
}
