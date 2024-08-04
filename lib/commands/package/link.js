import Command from "#lib/command";
import glob from "#core/glob";
import { readConfig } from "#core/config";
import fs from "node:fs";

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
                "allDependencies": this.#getDependencies( config ),
                "peerDependencies": this.#getDependencies( config, { "peerOnly": true } ),
            };
        }

        for ( const dep of this.#getDependencies( pkg.config ) ) {
            this.#processDependencies( dep, packages );
        }

        for ( const pkg of Object.values( packages ) ) {
            if ( !pkg.link ) continue;

            for ( const dep of pkg.allDependencies ) {
                if ( packages[ dep ]?.link ) {
                    pkg.removeNodeModules = true;

                    break;
                }
            }
        }

        for ( const dep of Object.values( packages ) ) {
            if ( !dep.link ) continue;

            if ( dep.removeNodeModules ) {
                console.log( `Remove "node_modules" for package: ${ dep.name }` );

                fs.rmSync( dep.path + "/node_modules", {
                    "force": true,
                    "recursive": true,
                } );
            }

            console.log( `Link package: ${ dep.name }` );

            fs.rmSync( pkg.root + "/node_modules/" + dep.name, {
                "force": true,
                "recursive": true,
            } );

            fs.symlinkSync( pkg.root + "/node_modules/" + dep.name, dep.path );
        }

        return result( 200 );
    }

    // private
    #getDependencies ( config, { peerOnly } = {} ) {
        return new Set( [

            //
            ...Object.keys( peerOnly ? {} : config.dependencies || {} ),
            ...Object.keys( peerOnly ? {} : config.devDependencies || {} ),
            ...Object.keys( config.peerDependencies || {} ),
        ] );
    }

    #processDependencies ( name, packages ) {
        if ( !packages[ name ] ) return;

        if ( packages[ name ].processed ) return;

        packages[ name ].processed = true;

        packages[ name ].link = true;

        for ( const dep of packages[ name ].peerDependencies ) {
            this.#processDependencies( dep, packages );
        }
    }
}