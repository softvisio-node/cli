import Command from "./command.js";

export default class extends Command {
    #codenames;

    constructor ( { codenames } ) {
        super();

        this.#codenames = codenames;
    }

    // static
    static cli () {
        return {
            "options": {
                "codename": {
                    "description": "ubuntu codename",
                    "schema": {
                        "type": "array",
                        "items": {
                            "type": "string",
                        },
                        "uniqueItems": true,
                    },
                },
            },
        };
    }

    // public
    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find root package` );

        var res;

        res = this.getCodenames( this.#codenames );
        if ( !res.ok ) return res;

        const codenames = res.data;

        for ( const codename of codenames ) {
            const image = `ghcr.io/${ this.repositoryId }:${ codename }`;

            res = this.spawnSync(
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
                    "cwd": this.resources + "/base-images",
                }
            );
            if ( !res.ok ) return res;

            res = this.spawnSync(
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
}
