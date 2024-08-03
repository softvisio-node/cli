import Command from "#lib/command";
import glob from "#core/glob";
import { readConfig } from "#core/config";

// import fs from "node:fs";

export default class extends Command {
    static cli () {
        return {};
    }

    // public
    async run () {
        const workspace = process.env[ "SOFTVISIO_CLI_WORKSPACE_" + process.platform ];

        if ( !workspace ) return result( [ 500, `No workspace configured` ] );

        const pkg = this._findPackage();

        if ( !pkg ) return result( [ 500, "Package not found" ] );

        const files = glob( "*/*/package.json", {
            "cwd": workspace,
        } );

        const packages = {};

        for ( const file of files ) {
            const config = readConfig( workspace + "/" + file );

            if ( !config.name || config.private ) continue;

            packages[ config.name ] = {
                "name": config.name,
                "path": workspace + "/" + file,
                "dependencies": this.#getDependencies( config ),
            };
        }

        for ( const name of this.#getDependencies( pkg.config ) ) {
            this.#findDependencies( name, packages );
        }

        for ( const pkg of Object.values( packages ) ) {
            if ( !pkg.link ) continue;

            for ( const dep of pkg.dependencies ) {
                if ( packages[ dep ] ) {
                    pkg.deleteNodeModules = true;

                    break;
                }
            }
        }

        for ( const pkg of Object.values( packages ) ) {
            if ( !pkg.link ) continue;
        }

        return result( 200 );
    }

    // private
    #getDependencies ( config ) {
        return new Set( [

            //
            ...Object.keys( config.dependencies || {} ),
            ...Object.keys( config.devDependencies || {} ),
            ...Object.keys( config.peerDependencies || {} ),
        ] );
    }

    #findDependencies ( name, packages ) {
        if ( !packages[ name ] ) return;

        if ( packages[ name ].processed ) return;

        packages[ name ].processed = true;

        packages[ name ].link = true;

        for ( const dep of packages[ name ].dependencies ) {
            this.#findDependencies( dep, packages );
        }
    }
}
