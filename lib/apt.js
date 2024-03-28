import "#core/result";
import { readConfig } from "#core/config";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";
import Git from "#core/git";

export default class {
    #root;
    #config;
    #codenames;
    #resources;
    #git;

    constructoro ( root ) {
        this.#root = root;
    }

    // properties
    get root () {
        return this.#root;
    }

    get resources () {
        this.#resources ??= fileURLToPath( import.meta.resolve( "#resources/apt" ) );

        return this.#resources;
    }

    get config () {
        if ( !this.#config ) {
            this.#config = readConfig( this.root + "/config.yaml" );
        }

        return this.#config;
    }

    get git () {
        this.#git ??= new Git( this.root );

        return this.#git;
    }

    get repositoryId () {
        return this.git.upstream.repoId;
    }

    // public
    async buildBaseImages ( codenames ) {
        var res;

        res = this.#getCodenames( codenames );
        if ( !res.ok ) return res;

        codenames = res.data;

        for ( const codename of codenames ) {
            const image = `ghcr.io/${ this.repositoryId }:${ codename }`;

            res = this.#spawnSync(
                "docker",
                [

                    //
                    `build`,
                    `--tag=${ image }`,
                    `--build-arg=FROM=ubuntu:${ codename }`,
                    `--pull`,
                    `--no-cache`,
                    `--shm-size=1g`,
                    `.`,
                ],
                {
                    "stdio": "inherit",
                    "cwd": this.root + "/base-images",
                }
            );
            if ( !res.ok ) return res;

            res = this.#spawnSync(
                "docker",
                [

                    //
                    `push`,
                    image,
                ],
                {
                    "stdio": "inherit",
                }
            );
            if ( !res.ok ) return res;
        }

        return result( 200 );
    }

    // private
    #getCodenames ( codenames ) {
        this.#codenames ??= new Set( this.config.codenames.map( codename => codename + "" ) );

        if ( !codenames ) {
            return result( 200, [ ...this.#codenames ] );
        }
        else {
            for ( const codename of codenames ) {
                if ( !this.#codenames.has( codename + "" ) ) return result( [ 400, `Codename "${ codename }" is not supported` ] );
            }

            return result( 200, codenames );
        }
    }

    #spawnSync ( command, args, options = {} ) {
        options = {
            "stdio": "ignore",
            "cwd": this.root,
            ...options,
        };

        const res = childProcess.spawnSync( command, args, options );

        if ( res.status === 0 ) {
            return result( 200, res );
        }
        else {
            return result( [ 500, `Command faiuled: ` + [ command, ...args ].join( " " ) ], res );
        }
    }
}
