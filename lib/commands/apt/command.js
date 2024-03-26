import "#core/result";
import { readConfig } from "#core/config";
import childProcess from "node:child_process";
import env from "#core/env";
import Git from "#core/api/git";

export default class {
    #config;
    #codenames;
    #git;

    // properties
    get root () {
        return env.root;
    }

    get repository () {
        return this.root;
    }

    get resources () {
        return this.root + "/resources";
    }

    get config () {
        if ( !this.#config ) {
            this.#config = readConfig( this.resources + "/config.yaml" );
        }

        return this.#config;
    }

    get git () {
        this.#git ??= new Git( this.repository );

        return this.#git;
    }

    get repositoryId () {
        return this.git.upstream.repoId;
    }

    // public
    getCodenames ( codenames ) {
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

    spawnSync ( command, args, options = {} ) {
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
