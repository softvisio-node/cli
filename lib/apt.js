import "#core/result";
import { readConfig } from "#core/config";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";
import Git from "#core/api/git";
import glob from "#core/glob";
import fs from "node:fs";
import ejs from "#core/ejs";
import path from "node:path";
import Semver from "#core/semver";
import tar from "#core/tar";
import yaml from "#core/yaml";
import Ajv from "#core/ajv";

const validateConfig = new Ajv().compileFile( import.meta.resolve( "#resources/apt/config.schema.yaml" ) );

export default class {
    #root;
    #config;
    #codenames;
    #resources;
    #git;

    constructor ( root ) {
        this.#root = root;
    }

    // properties
    get root () {
        return this.#root;
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
        this.#git ??= new Git( this.root );

        return this.#git;
    }

    get repositoryId () {
        return this.git.upstream.repoId;
    }

    // public
    checkRepository () {
        if ( !validateConfig( this.config ) ) return result( [ 500, `Repository config is not valid: ` + validateConfig.errors.toString() ] );

        return result( 200 );
    }

    async build ( packageName, { codenames, versions } = {} ) {
        var packages;

        if ( packageName === "all" ) {
            packages = glob( "*", {
                "cwd": this.root + "/packages",
            } ).filter( name => !name.endsWith( ".disabled" ) );

            versions = [ null ];
        }
        else {
            packages = [ packageName ];

            versions ||= [ null ];
        }

        const res = this.#getCodenames( codenames );
        if ( !res.ok ) return res;

        codenames = res.data;

        for ( const pkg of packages ) {
            const archAll = fs.readFileSync( this.root + "/packages/" + pkg, "utf8" ).includes( "ARCHITECTURE=all" );

            for ( const version of versions ) {
                if ( archAll ) {
                    const res = this.#spawnSync( this.resources + "/build.sh", [ pkg ], {
                        "stdio": "inherit",
                        "env": {
                            ...process.env,
                            "COMPONENT": this.config.component,
                            "MAINTAINER": this.config.maintainer,
                            "FORCE_VERSION": version || "",
                        },
                    } );
                    if ( !res.ok ) return res;
                }
                else {
                    for ( const codename of codenames ) {
                        const res = this.#spawnSync(
                            "docker",
                            [

                                //
                                "run",
                                "-i",
                                "--shm-size=1g",
                                `-v=${ this.root }:/var/local`,
                                `-v=${ this.resources + "/build.sh" }:/tmp/build.sh`,
                                `--env=MAINTAINER=${ this.config.maintainer }`,
                                `--env=COMPONENT=${ this.config.component }`,
                                `--env=FORCE_VERSION=${ version || "" }`,
                                `--workdir=/var/local`,
                                `--entrypoint=/tmp/build.sh`,
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
        }

        return result( 200 );
    }

    async update ( { deleteOldPackages } = {} ) {
        var res;

        res = this.installDeps();
        if ( !res.ok ) return res;

        if ( deleteOldPackages ) {
            res = this.#deleteOldPackages();
            if ( !res.ok ) return res;
        }

        for ( const codename of this.#getCodenames().data ) {
            fs.mkdirSync( this.root + `/dists/${ codename }/${ this.config.component }/binary-all`, {
                "recursive": true,
            } );

            res = this.#spawnSync(
                "apt-ftparchive",
                [

                    //
                    "--arch=all",
                    "packages",
                    "dists",
                ],
                {
                    "stdio": "pipe",
                }
            );
            if ( !res.ok ) return res;

            fs.writeFileSync( this.root + `/dists/${ codename }/${ this.config.component }/binary-all/Packages`, res.data.stdout );

            // XXX
            // cat dists/$version/main/binary-all/Packages | gzip -9 > dists/$version/main/binary-all/Packages.gz

            const architectures = glob( "binary-*", {
                "cwd": this.root + `/dists/${ codename }/${ this.config.component }`,
                "files": false,
                "directories": true,
            } )
                .map( name => name.replace( "binary-", "" ) )
                .filter( architecture => architecture !== "all" )
                .sort();

            for ( const architecture of architectures ) {
                res = this.#spawnSync(
                    "apt-ftparchive",
                    [

                        //
                        `--arch=${ architecture }`,
                        "packages",
                        `dists/${ codename }/${ this.config.component }/binary-${ architecture }`,
                    ],
                    {
                        "stdio": "pipe",
                    }
                );
                if ( !res.ok ) return res;

                fs.writeFileSync( this.root + `/dists/${ codename }/${ this.config.component }/binary-${ architecture }/Packages`, res.data.stdout );

                // XXX
                // cat dists/$version/main/binary-amd64/Packages | gzip -9 > dists/$version/main/binary-amd64/Packages.gz
            }

            fs.writeFileSync(
                this.root + `/dists/${ codename }/aptftp.conf`,
                ejs.fromFile( this.resources + "/aptftp.conf" ).render( {
                    "label": this.config.label,
                    codename,
                    "components": this.config.component,
                    "architectures": [ "all", ...architectures ].join( " " ),
                } )
            );

            res = this.#spawnSync(
                "apt-ftparchive",
                [

                    //
                    "release",
                    `-c=dists/${ codename }/aptftp.conf`,
                    `dists/${ codename }`,
                ],
                {
                    "stdio": "pipe",
                }
            );

            fs.rmSync( this.root + `/dists/${ codename }/aptftp.conf` );

            if ( !res.ok ) return res;

            fs.writeFileSync( this.root + `/dists/${ codename }/Release`, res.data.stdout );

            res = this.#spawnSync( "gpg", [

                //
                "--clearsign",
                "--yes",
                "-u",
                this.config.gpgKeyName,
                "-o",
                this.root + `/dists/${ codename }/InRelease`,
                this.root + `/dists/${ codename }/Release`,
            ] );
            if ( !res.ok ) return res;

            fs.rmSync( this.root + `/dists/${ codename }/Release` );
        }

        res = await this.git.run( "add", "." );
        if ( !res.ok ) return res;

        res = await this.git.run( "commit", "-m", "chore: update" );
        if ( !res.ok ) return res;

        res = await this.prune();
        if ( !res.ok ) return res;

        res = await this.git.run( "push", "--force", "--all" );
        if ( !res.ok ) return res;

        res = await this.git.run( "push", "--force", "--tags" );
        if ( !res.ok ) return res;

        return result( 200 );
    }

    async buildImages ( { codenames } = {} ) {
        var res;

        res = this.#getCodenames( codenames );
        if ( !res.ok ) return res;

        codenames = res.data;

        for ( const codename of codenames ) {
            const image = `ghcr.io/${ this.repositoryId }:${ codename }`;

            res = this.#spawnSync(
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
                    "cwd": this.root + "/images",
                }
            );
            if ( !res.ok ) return res;

            res = this.#spawnSync(
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

    installDeps () {
        return this.#spawnSync( "apt-get", [

            //
            "install",
            "-y",
            "apt-utils",
            "git-filter-repo",
        ] );
    }

    async prune () {
        const res = await this.#prune();

        this.#deleteFilterRepo();

        return res;
    }

    // private
    #getCodenames ( codenames ) {
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

    #spawnSync ( command, args, options = {} ) {
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

    async #prune () {
        var res;

        this.#deleteFilterRepo();

        // remove files, that were deleted from dists
        res = await this.git.run( "filter-repo", "--analyze" );
        if ( !res.ok ) return res;

        const deleted = fs
            .readFileSync( this.root + "/.git/filter-repo/analysis/path-deleted-sizes.txt", "utf8" )
            .split( "\n" )
            .slice( 2 )
            .map( line => line.replace( /\s+.+?\s+.+?\s+.+?\s+/, "" ) )
            .filter( line => line.startsWith( "dists/" ) );

        if ( !deleted.length ) return result( 200 );

        for ( const file of deleted ) {
            console.log( "Prune file:", file );
        }

        res = await this.git.run(

            //
            "filter-repo",
            "--force",
            "--partial",
            "--invert-paths",
            ...deleted.map( path => `--path=${ path }` )
        );
        if ( !res.ok ) return res;

        // git garbage collection
        res = await this.git.run( "reflog", "expire", "--expire-unreachable=now", "--all" );
        if ( !res.ok ) return res;

        res = await this.git.run( "gc", "--prune=now", "--aggressive" );
        if ( !res.ok ) return res;

        return result( 200 );
    }

    #deleteFilterRepo () {
        fs.rmSync( this.root + "/.git/filter-repo", {
            "recursive": true,
            "force": true,
        } );
    }

    #deleteOldPackages () {
        const files = glob( "**/*.deb", {
            "cwd": this.root + "/dists",
        } );

        const packages = {};

        for ( const file of files ) {
            const res = this.#getDistInfo( "dists/" + file );
            if ( !res.ok ) return res;

            const dist = res.data;

            packages[ dist.id ] ||= [];

            packages[ dist.id ].push( dist );
        }

        for ( let dists of Object.values( packages ) ) {
            if ( dists.length === 1 ) continue;

            // sort dists
            dists = dists.sort( ( a, b ) => {
                return a.epoch - b.epoch || new Semver( a.version ).compare( b.version ) || a.revision - b.revision;
            } );

            // keep latest dist
            dists.pop();

            // remove old dists
            for ( const dist of dists ) {
                console.log( "Remove package:", dist.file );

                fs.rmSync( this.#root + "/" + dist.file );
            }
        }

        return result( 200 );
    }

    #getDistInfo ( file ) {
        var res;

        res = this.#spawnSync( "ar", [ "p", this.#root + "/" + file, "control.tar.gz" ], { "stdio": "pipe" } );
        if ( !res.ok ) return res;

        tar.list( {
            "filter": path => path === "./control",
            "onentry": entry => {
                entry.on( "data", data => {
                    const control = yaml.parse( data );

                    const match = control.Version.match( /^(?:(\d+):)?([\d.]+)(?:-(\d+))?$/ );

                    if ( !match ) {
                        res = result( [ 500, `Unable to parse dist version: ${ control.Version }` ] );
                    }
                    else {
                        const dist = {
                            "id": path.dirname( file ) + "/" + control.Package + "-" + control.Architecture,
                            file,
                            "name": control.Package,
                            "epoch": match[ 1 ] ? +match[ 1 ] : 0,
                            "version": match[ 2 ],
                            "revision": match[ 3 ] ? +match[ 3 ] : 0,
                            "arch": control.Architecture,
                        };

                        res = result( 200, dist );
                    }
                } );
            },
        } ).write( res.data.stdout );

        return res;
    }
}
