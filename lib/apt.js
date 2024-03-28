import "#core/result";
import { readConfig } from "#core/config";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";
import Git from "#core/git";
import glob from "#core/glob";
import fs from "node:fs";
import ejs from "#core/ejs";

export default class {
    #root;
    #config;
    #codenames;
    #resources;
    #git;

    constructoro ( root ) {
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
    async buuild ( packageName, codenames ) {
        var packages;

        if ( packageName === "all" ) {
            packages = glob( "*", {
                "cwd": this.root + "/packages",
            } ).filter( name => !name.endsWith( ".disabled" ) );
        }
        else {
            packages = [ packageName ];
        }

        const res = this.#getCodenames( codenames );
        if ( !res.ok ) return res;

        codenames = res.data;

        for ( const pkg of packages ) {
            if ( fs.readFileSync( this.root + "/packages/" + pkg, "utf8" ).includes( "ARCHITECTURE=all" ) ) {
                const res = this.#spawnSync( this.resources + "/build.sh", [ pkg ], {
                    "stdio": "inherit",
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

        return result( 200 );
    }

    async update () {
        var res;

        res = this.installDeps();
        if ( !res.ok ) return res;

        for ( const codename of this.getCodenames().data ) {
            fs.mkdirSync( this.root + `/dists/${ codename }/main/binary-all`, {
                "recursive": true,
            } );

            fs.writeFileSync(
                this.root + `/dists/${ codename }/aptftp.conf`,
                ejs.fromFile( this.resources + "/aptftp.conf" ).render( {
                    "label": this.config.label,
                    codename,
                    "architectures": [ "all", "amd6" ].join( " " ),
                } )
            );

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

            fs.writeFileSync( this.root + `/dists/${ codename }/main/binary-all/Packages`, res.data.stdout );

            // XXX
            // cat dists/$version/main/binary-all/Packages | gzip -9 > dists/$version/main/binary-all/Packages.gz

            fs.mkdirSync( this.root + `/dists/${ codename }/main/binary-amd64`, {
                "recursive": true,
            } );

            res = this.#spawnSync(
                "apt-ftparchive",
                [

                    //
                    "--arch=amd64",
                    "packages",
                    `dists/${ codename }/main/binary-amd64`,
                ],
                {
                    "stdio": "pipe",
                }
            );
            if ( !res.ok ) return res;

            fs.writeFileSync( this.root + `/dists/${ codename }/main/binary-amd64/Packages`, res.data.stdout );

            // XXX
            // cat dists/$version/main/binary-amd64/Packages | gzip -9 > dists/$version/main/binary-amd64/Packages.gz

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
            if ( !res.ok ) return res;

            fs.writeFileSync( this.root + `/dists/${ codename }/Release`, res.data.stdout );

            res = this.#spawnSync( "gpg", [

                //
                "--clearsign",
                "--yes",
                "-u",
                `zdm@softvisio.net`,
                "-o",
                this.root + `/dists/${ codename }/InRelease`,
                this.root + `/dists/${ codename }/Release`,
            ] );
            if ( !res.ok ) return res;

            fs.rmSync( this.root + `/dists/${ codename }/Release` );
        }

        res = await this.git.run( "add", "dists" );
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

    async buildBaseImages ( codenames ) {
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
                    "cwd": this.root + "/base-images",
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
        return this.spawnSync( "apt-get", [

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

        console.log( `Prune packages:`, deleted.join( ", " ) );

        res = await this.git.run( "filter-repo", "--force", "--partial", "--invert-paths", ...deleted.map( path => `--path=${ path }` ) );
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
}
