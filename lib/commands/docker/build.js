import Command from "#lib/command";
import DockerBuilder from "#core/api/docker/builder";
import env from "#core/env";

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
        const rootPackage = this._findGitPackage();

        if ( !rootPackage ) this._throwError( "Unable to find root package" );

        const cliConfig = rootPackage.cliConfig;

        const abortController = new AbortController(),
            signal = abortController.signal;

        const builder = new DockerBuilder( rootPackage.root, {
            signal,
            "credentials": image => {
                env.loadUserEnv();

                return {
                    "ghcr.io": {
                        "username": process.env.GITHUB_USERNAME,
                        "password": process.env.GITHUB_TOKEN,
                    },
                };
            },
            "tag": process.cli.arguments.tag || cliConfig.docker?.build?.defaultTag,
            "autoTags": cliConfig.docker?.build?.autoTags,
            "push": process.cli.options.push,
            "remove": process.cli.options.remove,
            "interactive": true,
            "force": process.cli.options.force,
        } );

        const res = await builder.run();

        return res;
    }
}
