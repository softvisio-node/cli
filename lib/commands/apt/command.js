import Command from "#lib/command";
import "#core/result";
import { readConfig } from "#core/config";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";

export default class extends Command {
    #rootPackage;
    #config;
    #codenames;
    #resources;

    constructor () {
        super();

        this.#rootPackage = this._findRootPackage();
    }

    // properties
    get root () {
        return this.#rootPackage?.root;
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
        return this.#rootPackage.git;
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
