import "#core/result";
import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import Ajv from "#core/ajv";
import Git from "#core/api/git";
import { readConfigSync } from "#core/config";
import ejs from "#core/ejs";
import { exists } from "#core/fs";
import { glob, globSync } from "#core/glob";
import Semver from "#core/semver";
import tar from "#core/tar";
import yaml from "#core/yaml";

const validateConfig = new Ajv().compileFile( import.meta.resolve( "#resources/deb/config.schema.yaml" ) );

export default class DebianRepository {
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

    get distsRoot () {
        return this.#root + "/dists";
    }

    get resources () {
        this.#resources ??= fileURLToPath( import.meta.resolve( "#resources/deb" ) );

        return this.#resources;
    }

    get config () {
        if ( !this.#config ) {
            this.#config = readConfigSync( this.root + "/config.yaml" );
        }

        return this.#config;
    }

    get git () {
        this.#git ??= new Git( this.distsRoot );

        return this.#git;
    }

    get repositorySlug () {
        return this.git.upstream.repositorySlug;
    }

    // public
    async checkRepository () {

        // validate config
        if ( !validateConfig( this.config ) ) {
            return result( [ 500, `Repository config is not valid: ` + validateConfig.errors.toString() ] );
        }

        var res;

        // check dists
        if ( !( await exists( this.distsRoot ) ) ) {
            const git = new Git( this.root ),
                upstream = git.upstream;

            if ( !upstream ) return result( [ 500, `Git upstream is not valid` ] );

            res = await git.exec( [ "ls-remote", "--branches", "--refs", "--quiet", upstream.sshUrl, "dists" ] );
            if ( !res.ok ) return res;

            // create "dists" branch
            if ( !res.data ) {
                res = await git.exec( [ "init", "--initial-branch", "dists", this.distsRoot ] );
                if ( !res.ok ) return res;

                res = await git.exec( [ "commit", "--allow-empty", "-m", "chore: init" ] );
                if ( !res.ok ) return res;

                res = await git.exec( [ "push", "--set-upstream", upstream.sshUrl, "dists" ] );
                if ( !res.ok ) return res;
            }

            // clone "dists" branch
            else {
                res = await git.exec( [ "clone", "--single-branch", "--branch", "dists", upstream.sshUrl, "dists" ] );
                if ( !res.ok ) return res;
            }
        }

        return result( 200 );
    }

    async buildPackages ( { packages, codenames, versions } = {} ) {
        if ( !packages ) {
            packages = await glob( "*", {
                "cwd": this.root + "/packages",
            } );

            versions = [ null ];
        }
        else {
            if ( !Array.isArray( packages ) ) packages = [ packages ];

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
                                `ghcr.io/${ this.repositorySlug }:${ codename }`,
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

    async update ( { deleteOutdatedPackages } = {} ) {
        var res;

        res = this.installDeps();
        if ( !res.ok ) return res;

        if ( deleteOutdatedPackages ) {
            res = this.#deleteOutdatedPackages();
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

            // make "Packages.gz"
            await new Promise( resolve => {
                pipeline(
                    fs.createReadStream( this.root + `/dists/${ codename }/${ this.config.component }/binary-all/Packages` ),
                    zlib.createGzip( {
                        "level": 9,
                    } ),
                    fs.createWriteStream( this.root + `/dists/${ codename }/${ this.config.component }/binary-all/Packages.gz` ),
                    e => {}
                ).on( "close", resolve );
            } );

            const architectures = (
                await glob( "binary-*", {
                    "cwd": this.root + `/dists/${ codename }/${ this.config.component }`,
                    "files": false,
                    "directories": true,
                } )
            )
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

                // make "Packages.gz"
                await new Promise( resolve => {
                    pipeline(
                        fs.createReadStream( this.root + `/dists/${ codename }/${ this.config.component }/binary-${ architecture }/Packages` ),
                        zlib.createGzip( {
                            "level": 9,
                        } ),
                        fs.createWriteStream( this.root + `/dists/${ codename }/${ this.config.component }/binary-${ architecture }/Packages.gz` ),
                        e => {}
                    ).on( "close", resolve );
                } );
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

            // create "Release"
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

            // create "Release.gpg"
            res = this.#spawnSync( "gpg", [

                //
                "--sign",
                "--detach-sign",
                "--armor",
                "--yes",
                "-u",
                this.config.gpgKeyName,
                "-o",
                this.root + `/dists/${ codename }/Release.gpg`,
                this.root + `/dists/${ codename }/Release`,
            ] );
            if ( !res.ok ) return res;

            // create "InRelease"
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
        }

        res = await this.git.exec( [ "add", "." ] );
        if ( !res.ok ) return res;

        res = await this.git.exec( [ "commit", "-m", "chore: update distributions" ] );
        if ( !res.ok ) return res;

        res = await this.prune();
        if ( !res.ok ) return res;

        res = await this.git.exec( [ "push", "--force", "--all" ] );
        if ( !res.ok ) return res;

        return result( 200 );
    }

    async buildImages ( { codenames } = {} ) {
        var res;

        res = this.#getCodenames( codenames );
        if ( !res.ok ) return res;

        codenames = res.data;

        for ( const codename of codenames ) {
            const image = `ghcr.io/${ this.repositorySlug }:${ codename }`;

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
                    `--label=org.opencontainers.image.source=${ this.git.upstream.homeUrl }`,
                    `--label=org.opencontainers.image.description=ubuntu:${ codename }`,
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

        // get first commit of "dists" branch
        res = await this.git.exec( [ "rev-list", "--max-parents=0", "HEAD" ] );
        if ( !res.ok ) return res;
        const firstCommit = res.data;

        // reset to first commit
        res = await this.git.exec( [ "reset", "--soft", firstCommit ] );
        if ( !res.ok ) return res;

        // commit
        res = await this.git.exec( [ "commit", "-a", "--amend", "-m", "chore: distributions updated" ] );
        if ( !res.ok ) return res;

        // push
        res = await this.git.exec( [ "push", "origin", "HEAD", "--force" ] );
        if ( !res.ok ) return res;

        // git garbage collection
        res = await this.git.exec( [ "reflog", "expire", "--expire-unreachable=now", "--all" ] );
        if ( !res.ok ) return res;

        res = await this.git.exec( [ "gc", "--prune=now", "--aggressive" ] );
        if ( !res.ok ) return res;

        return result( 200 );
    }

    #deleteOutdatedPackages () {
        const files = globSync( "**/*.deb", {
            "cwd": this.distsRoot,
        } );

        const packages = {};

        for ( const file of files ) {
            const res = this.#getDistInfo( file );
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

                fs.rmSync( this.distsRoot + "/" + dist.file );
            }
        }

        return result( 200 );
    }

    #getDistInfo ( file ) {
        var res;

        res = this.#spawnSync( "ar", [ "p", this.distsRoot + "/" + file, "control.tar.gz" ], { "stdio": "pipe" } );
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
                            "epoch": match[ 1 ]
                                ? +match[ 1 ]
                                : 0,
                            "version": match[ 2 ],
                            "revision": match[ 3 ]
                                ? +match[ 3 ]
                                : 0,
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
