import Command from "#lib/command";
import glob from "#core/glob";
import fs from "node:fs";

export default class extends Command {
    #packageSpec;
    #codenames;

    constructor ( { packageSpec, codenames } ) {
        super();

        this.#packageSpec = packageSpec;
        this.#codenames = codenames;
    }

    // public
    async run () {
        var packages;

        if ( this.#packageSpec === "all" ) {
            packages = glob( "*", {
                "cwd": this.resources + "/packages",
            } ).filter( name => !name.endsWith( ".disabled" ) );
        }
        else {
            packages = [ this.#packageSpec ];
        }

        const res = this.getCodenames( this.#codenames );
        if ( !res.ok ) return res;

        const codenames = res.data;

        for ( const pkg of packages ) {
            if ( fs.readFileSync( this.resources + "/packages/" + pkg, "utf8" ).includes( "ARCHITECTURE=all" ) ) {
                const res = this.spawnSync( this.resources + "/build.sh", [ pkg ], {
                    "stdio": "inherit",
                } );
                if ( !res.ok ) return res;
            }
            else {
                for ( const codename of codenames ) {
                    const res = this.spawnSync(
                        "docker",
                        [

                            //
                            "run",
                            "-i",
                            "--shm-size=1g",
                            `-v=${ this.root }:/var/local`,
                            `--workdir=/var/local`,
                            `--entrypoint=/var/local/resources/build.sh`,
                            `ghcr.io/${ this.repositoryId }:${ codename }`,
                            pkg,
                        ],
                        {
                            "stdio": "inherit",
                        }
                    );

                    if ( !res.ok ) return res;
                }
            }
        }

        return result( 200 );
    }
}
