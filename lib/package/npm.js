import { TmpDir } from "#core/tmp";
import { repeatAction } from "#core/utils";
import NpmApi from "#lib/npm";

export default class Npm {
    #pkg;
    #api;

    constructor ( pkg ) {
        this.#pkg = pkg;

        this.#api = new NpmApi( {
            "cwd": this.#pkg.root,
        } );
    }

    // properties
    get pkg () {
        return this.#pkg;
    }

    get api () {
        return this.#api;
    }

    // public
    async publish ( { commitRef, accessStatus, repeatOnError } = {} ) {
        var res;

        res = await repeatAction(
            async () => {
                var res;

                try {
                    process.stdout.write( `Publishing npm package "${ this.pkg.name }" ...` );

                    res = await this.#publish( { commitRef, accessStatus } );

                    console.log( res + "" );

                    return res;
                }
                catch ( e ) {
                    res = result.catch( e );

                    console.log( "Publishing npm package ...", res + "" );

                    throw res;
                }
            },
            {
                repeatOnError,
            }
        );
        if ( !res.ok ) return res;

        res = await this.setTags( { repeatOnError } );
        if ( !res.ok ) return res;

        if ( accessStatus ) {
            res = await this.setAccessStatus( accessStatus, { repeatOnError } );
            if ( !res.ok ) return res;
        }

        return result( 200 );
    }

    async setTags ( { repeatOnError } = {} ) {
        if ( this.pkg.isPrivate ) return result( [ 200, "Package is private" ] );
        if ( !this.pkg.name ) return result( [ 500, "Package has no name" ] );

        return repeatAction(
            async () => {
                process.stdout.write( `Setting npm tags for "${ this.pkg.name }" ...` );

                const res = await this.#setTags();

                console.log( res + "" );

                if ( !res.ok ) throw res;

                return res;
            },
            {
                repeatOnError,
            }
        );
    }

    async setAccessStatus ( accessStatus, { repeatOnError } = {} ) {
        if ( this.pkg.isPrivate ) return result( [ 200, "Package is private" ] );
        if ( !this.pkg.name ) return result( [ 500, "Package has no name" ] );

        if ( accessStatus && this.pkg.name.startsWith( "@" ) ) {
            const res = await repeatAction(
                async () => {
                    process.stdout.write( `Setting npm access status for "${ this.pkg.name }"...` );

                    const res = await this.api.setAccessStatus( this.pkg.name, accessStatus );

                    console.log( res + "" );

                    if ( !res.ok ) throw res;

                    return res;
                },
                {
                    repeatOnError,
                }
            );

            if ( !res.ok ) return res;
        }

        return result( 200 );
    }

    // private
    async #publish ( { commitRef, accessStatus } = {} ) {
        commitRef ||= "HEAD";

        if ( this.pkg.isPrivate ) return result( [ 200, "Package is private" ] );
        if ( !this.pkg.name ) return result( [ 500, "Package has no name" ] );

        var res;

        // get commit
        res = await this.pkg.git.getCommit( { commitRef } );
        if ( !res.ok ) throw res;
        const commit = res.data;

        // commit is not a release
        if ( !commit?.isRelease ) return result( [ 400, "Git commit is not released" ] );

        // get package versions
        res = await this.api.getPackageVersions( this.pkg.name );
        if ( !res.ok ) {

            // package not found
            if ( res.data?.error?.code === "E404" ) {
                res.data = null;
            }
            else {
                throw res;
            }
        }
        const versions = new Set( res.data );

        // version already published
        if ( versions.has( commit.releaseVersion.version ) ) return result( [ 200, "Package already published" ] );

        // checkout
        await using workTree = new TmpDir();
        res = await this.pkg.git.exec( [ `--work-tree=${ workTree.path }`, "checkout", commitRef, "--", "." ] );
        if ( !res.ok ) throw res;

        const { "default": Package } = await import( "#lib/package" ),
            pkg = new Package( workTree.path );

        // pack
        res = await pkg.npm.api.pack( {
            "executablesPatterns": pkg.cliConfig?.meta?.executables,
        } );
        if ( !res.ok ) throw res;
        await using pack = res.data.pack;

        if ( !pkg.name.startsWith( "@" ) ) {
            accessStatus = null;
        }

        // publish
        res = await pkg.npm.api.publish( {
            "packPath": pack.path,
            accessStatus,
            "tag": commit.tags.has( "latest" )
                ? "latest"
                : commit.tags.has( "next" )
                    ? "next"
                    : null,
        } );
        if ( !res.ok ) throw res;

        return result( 200 );
    }

    async #setTags () {
        var res;

        res = await this.api.getPackageTags( this.pkg.name );
        if ( !res.ok ) return res;

        const versions = res.data;

        for ( const tag of [ "latest", "next" ] ) {
            res = await this.pkg.git.getCommit( { "commitRef": tag } );
            if ( !res.ok ) return res;
            const commit = res.data;

            let version;

            if ( commit?.isRelease ) version = commit.releaseVersion.version;

            if ( version ) {
                if ( versions[ tag ] !== version ) {
                    res = await this.api.setPackageTag( this.pkg.name, version, tag );
                    if ( !res.ok ) return res;
                }
            }
            else {
                if ( versions[ tag ] ) {
                    res = await this.api.deletePackageTag( this.pkg.name, tag );
                    if ( !res.ok ) return res;
                }
            }
        }

        return result( 200 );
    }
}
