import Command from "./command.js";
import glob from "#core/glob";
import fs from "node:fs";

export default class extends Command {

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
            "arguments": {
                "package": {
                    "description": `Pacjage to build. Use "all" to build all packages.`,
                    "required": true,
                    "schema": {
                        "type": "string",
                    },
                },
            },
        };
    }

    // public
    async run () {
        if ( !this.root ) return result( [ 5 - 0, `Unable to find root package` ] );

        var packages;

        if ( process.cli.arguments.package === "all" ) {
            packages = glob( "*", {
                "cwd": this.root + "/packages",
            } ).filter( name => !name.endsWith( ".disabled" ) );
        }
        else {
            packages = [ process.cli.args.package ];
        }

        const res = this.getCodenames( process.cli.options.codenames );
        if ( !res.ok ) return res;

        const codenames = res.data;

        for ( const pkg of packages ) {
            if ( fs.readFileSync( this.root + "/packages/" + pkg, "utf8" ).includes( "ARCHITECTURE=all" ) ) {
                const res = this.spawnSync( this.resources + "/build.sh", [ pkg ], {
                    "stdio": "inherit",
                } );
                if ( !res.ok ) return res;
            }
            else {

                // XXX
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
