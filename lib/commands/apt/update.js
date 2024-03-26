import Command from "#lib/command";
import fs from "node:fs";
import ejs from "#core/ejs";

export default class extends Command {

    // public
    async run () {
        var res;

        res = this.installDeps();
        if ( !res.ok ) return res;

        for ( const codename of this.getCodenames().data ) {
            fs.mkdirSync( this.repository + `/dists/${ codename }/main/binary-all`, {
                "recursive": true,
            } );

            fs.writeFileSync(
                this.repository + `/dists/${ codename }/aptftp.conf`,
                ejs.fromFile( this.resources + "/aptftp.conf" ).render( {
                    "label": this.config.label,
                    codename,
                    "architectures": this.config.architectures.join( " " ),
                } )
            );

            res = this.spawnSync(
                "apt-ftparchive",
                [

                    //
                    "--arch=all",
                    "packages",
                    "dists",
                ],
                {
                    "stdio": "pipe",
                    "cwd": this.repository,
                }
            );
            if ( !res.ok ) return res;

            fs.writeFileSync( this.repository + `/dists/${ codename }/main/binary-all/Packages`, res.data.stdout );

            // XXX
            // cat dists/$version/main/binary-all/Packages | gzip -9 > dists/$version/main/binary-all/Packages.gz

            fs.mkdirSync( this.repository + `/dists/${ codename }/main/binary-amd64`, {
                "recursive": true,
            } );

            res = this.spawnSync(
                "apt-ftparchive",
                [

                    //
                    "--arch=amd64",
                    "packages",
                    `dists/${ codename }/main/binary-amd64`,
                ],
                {
                    "stdio": "pipe",
                    "cwd": this.repository,
                }
            );
            if ( !res.ok ) return res;

            fs.writeFileSync( this.repository + `/dists/${ codename }/main/binary-amd64/Packages`, res.data.stdout );

            // XXX
            // cat dists/$version/main/binary-amd64/Packages | gzip -9 > dists/$version/main/binary-amd64/Packages.gz

            res = this.spawnSync(
                "apt-ftparchive",
                [

                    //
                    "release",
                    `-c=dists/${ codename }/aptftp.conf`,
                    `dists/${ codename }`,
                ],
                {
                    "stdio": "pipe",
                    "cwd": this.repository,
                }
            );
            if ( !res.ok ) return res;

            fs.writeFileSync( this.repository + `/dists/${ codename }/Release`, res.data.stdout );

            res = this.spawnSync( "gpg", [

                //
                "--clearsign",
                "--yes",
                "-u",
                `zdm@softvisio.net`,
                "-o",
                this.repository + `/dists/${ codename }/InRelease`,
                this.repository + `/dists/${ codename }/Release`,
            ] );
            if ( !res.ok ) return res;

            fs.rmSync( this.repository + `/dists/${ codename }/Release` );
        }

        res = await this.git.run( "add", "." );
        if ( !res.ok ) return res;

        res = await this.git.run( "commit", "-m", "chore: update", "-a" );
        if ( !res.ok ) return res;

        res = await this.prune();
        if ( !res.ok ) return res;

        res = await this.git.run( "push", "--force", "--all" );
        if ( !res.ok ) return res;

        res = await this.git.run( "push", "--force", "--tags" );
        if ( !res.ok ) return res;

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
    async #prune () {
        var res;

        this.#deleteFilterRepo();

        // remove files, that were deleted from dists
        res = await this.git.run( "filter-repo", "--analyze" );
        if ( !res.ok ) return res;

        const deleted = fs
            .readFileSync( this.repository + "/.git/filter-repo/analysis/path-deleted-sizes.txt", "utf8" )
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
        fs.rmSync( this.repository + "/.git/filter-repo", {
            "recursive": true,
            "force": true,
        } );
    }
}
