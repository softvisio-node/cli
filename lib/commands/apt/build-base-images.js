import Command from "#lib/command";

export default class extends Command {
    #codenames;

    constructor ( { codenames } ) {
        super();

        this.#codenames = codenames;
    }

    // public
    async run () {
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
