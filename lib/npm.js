import childProcess from "node:child_process";
import fs from "node:fs";
import env from "#core/env";
import { calculateMode } from "#core/fs";
import GlobPatterns from "#core/glob/patterns";
import stream from "#core/stream";
import { TarStreamPacker, TarStreamUnpacker } from "#core/stream/tar";
import { TmpDir, TmpFile } from "#core/tmp";
import { shellQuote } from "#core/utils";

export default class Npm {
    #npm;
    #cwd;
    #registry;

    constructor ( { npm, cwd, registry } = {} ) {
        this.#npm = npm || process.platform === "win32"
            ? "npm.cmd"
            : "npm";

        this.#cwd = cwd;
        this.#registry = registry;
    }

    // properties
    get npm () {
        return this.#npm;
    }

    get cwd () {
        return this.#cwd;
    }

    get registry () {
        return this.#registry;
    }

    // public
    async exec ( args, { cwd, registry } = {} ) {
        if ( !Array.isArray( args ) ) args = [ args ];

        args = [ this.npm, ...args, "--json" ];

        registry ||= this.registry;

        if ( registry ) {
            args.push( "--registry=" + registry );
        }

        args = shellQuote( args );

        if ( this.#cwd ) cwd ??= this.#cwd;

        return new Promise( resolve => {
            try {
                const proc = childProcess.spawn( args, {
                    cwd,
                    "shell": true,
                    "encoding": "buffer",
                    "stdio": [ "ignore", "pipe", "pipe" ],
                } );

                const stdout = [],
                    stderr = [];

                proc.stdout.on( "data", data => stdout.push( data ) );

                proc.stderr.on( "data", data => stderr.push( data ) );

                proc.once( "close", code => {
                    var res;

                    if ( code ) {
                        let data = Buffer.concat( stdout );
                        data = JSON.parse( data );

                        res = result( [ 500, data.error.summary ], data );
                    }
                    else {
                        let data = Buffer.concat( stdout );
                        data = JSON.parse( data );

                        res = result( 200, data );
                    }

                    resolve( res );
                } );
            }
            catch ( e ) {
                resolve( result( [ 500, e.message ] ) );
            }
        } );
    }

    async getPackageVersions ( packageName, { cwd, registry } = {} ) {
        const args = [ "view", packageName, "versions" ];

        return this.exec( args, {
            cwd,
            registry,
        } );
    }

    async getPackageTags ( packageName, { cwd, registry } = {} ) {
        const args = [ "view", packageName, "dist-tags" ];

        return this.exec( args, {
            cwd,
            registry,
        } );
    }

    async setPackageTag ( packageName, packageVersion, tag, { cwd, registry } = {} ) {
        packageName = `${ packageName }@${ packageVersion }`;

        const args = [ "dist-tag", "add", packageName, tag ];

        return this.exec( args, {
            cwd,
            registry,
        } );
    }

    async deletePackageTag ( packageName, tag, { cwd, registry } = {} ) {
        const args = [ "dist-tag", "rm", packageName, tag ];

        return this.exec( args, {
            cwd,
            registry,
        } );
    }

    async getPackageAccessStatus ( packageName, { cwd, registry } = {} ) {
        const args = [ "access", "get", "status", packageName ];

        const res = await this.exec( args, {
            cwd,
            registry,
        } );

        if ( res.ok ) {
            res.data = res.data[ packageName ];
        }

        return res;
    }

    async setPackageAccessStatus ( packageName, privateAccess, { cwd, registry } = {} ) {
        const args = [ "access", "set", "status=" + ( privateAccess
            ? "private"
            : "public" ), packageName ];

        const res = await this.exec( args, {
            cwd,
            registry,
        } );

        if ( res.ok ) {
            res.data = res.data[ packageName ];
        }

        return res;
    }

    async pack ( { cwd, executablesPatterns } = {} ) {
        cwd = env.findPackageRoot( cwd );
        if ( !cwd ) return result( [ 500, "Package not found" ] );

        const tmpDir = new TmpDir(),
            args = [ "pack", "--pack-destination", tmpDir.path ],
            res = await this.exec( args, {
                cwd,
            } );

        if ( !res.ok ) return res;

        const filename = res.data[ 0 ].filename,
            tmpFile = new TmpFile( {
                "extname": ".tgz",
            } );

        executablesPatterns = executablesPatterns
            ? new GlobPatterns().add( executablesPatterns )
            : null;

        // fix permissions
        await stream.promises.pipeline(

            //
            fs.createReadStream( tmpDir.path + "/" + filename ),
            new TarStreamUnpacker(),
            new TarStreamPacker( {
                "gzip": true,
                "onWriteEntry": writeEntry => {
                    if ( executablesPatterns?.test( writeEntry.path.replace( /^package\//, "" ) ) ) {
                        writeEntry.mode = calculateMode( "rwxr-xr-x" );
                    }
                    else {
                        writeEntry.mode = calculateMode( "rw-r--r--" );
                    }
                },
            } ),
            fs.createWriteStream( tmpFile.path )
        );

        return result( 200, {
            "pack": tmpFile,
        } );
    }

    async publish ( { executablesPatterns, packPath, "private": privateAccess, tag, cwd, registry } = {} ) {
        if ( !packPath ) {
            const res = await this.pack( {
                executablesPatterns,
                cwd,
            } );
            if ( !res.ok ) return res;

            var pack = res.data.pack;

            packPath = pack.path;
        }

        const args = [ "publish" ];

        if ( privateAccess != null ) {
            args.push( "--access", privateAccess
                ? "restricted"
                : "public" );
        }

        if ( tag ) {
            args.push( "--tag", tag );
        }

        args.push( packPath );

        return this.exec( args, {
            cwd,
            registry,
        } );
    }
}
