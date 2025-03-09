import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readConfig } from "#core/config";
import { exists } from "#core/fs";
import { glob } from "#core/glob";
import Command from "#lib/command";

const IGNORE = [ ".cache", ".external-resources" ];

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "install": {
                    "short": "i",
                    "description": `perform "npm install" before linking`,
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "update": {
                    "short": "u",
                    "description": `perform "npm update" before linking`,
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "dry-run": {
                    "description": "dry run",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
            },
        };
    }

    // public
    async run () {
        const workspace = process.env[ "SOFTVISIO_CLI_WORKSPACE_" + process.platform.toUpperCase() ];

        if ( !workspace ) return result( [ 500, `No workspace configured` ] );

        const pkg = this._findPackage();

        if ( !pkg ) return result( [ 500, "Package not found" ] );

        if ( !process.cli.options[ "dry-run" ] ) {
            if ( process.cli.options.install || process.cli.options.update ) {
                let command;

                if ( process.cli.options.update ) {
                    command = "update";

                    console.log( `Updating dependencies ...` );
                }
                else {
                    command = "install";

                    console.log( `Installing dependencies ...` );
                }

                const res = childProcess.spawnSync( "npm", [ command ], {
                    "stdio": "inherit",
                    "shell": true,
                } );

                if ( res.status ) return result( 500 );
            }
        }

        const files = await glob( "*/*/package.json", {
            "cwd": workspace,
        } );

        const packages = {};

        for ( const file of files ) {
            const config = await readConfig( workspace + "/" + file );

            if ( !config.name || config.private ) continue;

            packages[ config.name ] = {
                "name": config.name,
                "path": path.dirname( workspace + "/" + file ),
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

            console.log( `Link package: ${ dep.name }` );

            if ( !process.cli.options[ "dry-run" ] ) {

                // create node_modules
                if ( !( await exists( pkg.root + "/node_modules/" + path.dirname( dep.name ) ) ) ) {
                    fs.mkdirSync( pkg.root + "/node_modules/" + path.dirname( dep.name ), {
                        "recursive": true,
                    } );
                }

                fs.rmSync( pkg.root + "/node_modules/" + dep.name, {
                    "force": true,
                    "recursive": true,
                } );

                if ( process.platform === "win32" ) {
                    fs.symlinkSync( dep.path, pkg.root + "/node_modules/" + dep.name, "junction" );
                }
                else {
                    fs.symlinkSync( dep.path, pkg.root + "/node_modules/" + dep.name, "dir" );
                }
            }

            // remove node modules
            if ( dep.removeNodeModules && ( await exists( dep.path + "/node_modules" ) ) ) {
                console.log( `Remove "node_modules" for package: ${ dep.name }` );

                if ( !process.cli.options[ "dry-run" ] ) {
                    const files = await glob( "*", {
                        "cwd": dep.path + "/node_modules",
                        "absolute": true,
                        "ignore": IGNORE,
                        "files": true,
                        "directories": true,
                    } );

                    const promises = [];

                    for ( const file of files ) {
                        promises.push( fs.promises.rm( file, {
                            "force": true,
                            "recursive": true,
                        } ) );
                    }

                    await Promise.all( promises );
                }
            }
        }

        return result( 200 );
    }

    // private
    #getDependencies ( config, { peerOnly } = {} ) {
        return new Set( [

            //
            ...Object.keys( peerOnly
                ? {}
                : config.dependencies || {} ),
            ...Object.keys( peerOnly
                ? {}
                : config.devDependencies || {} ),
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
