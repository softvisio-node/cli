import childProcess from "node:child_process";
import fs from "node:fs";
import _path from "node:path";
import GitHub from "#core/api/github";
import env from "#core/env";
import File from "#core/file";
import { exists } from "#core/fs";
import Markdown from "#core/markdown";
import ansi from "#core/text/ansi";
import { TmpFile } from "#core/tmp";
import { confirm, repeatAction } from "#core/utils";
import { lintFile } from "#lib/lint";

export default class Publish {
    #pkg;
    #preRelease;
    #yes;
    #dropPreRelease;

    #baseVersion;
    #previousVersion;
    #newVersion;
    #upstream;
    #changelog;
    #latestTag;
    #nextTag;

    constructor ( pkg, { preRelease, yes } = {} ) {
        this.#pkg = pkg;
        this.#preRelease = preRelease;
        this.#yes = !!yes;

        if ( this.#preRelease === "release" ) {
            this.#preRelease = null;
            this.#dropPreRelease = true;
        }
    }

    // public
    async run () {
        env.loadUserEnv();

        // check user config
        if ( !process.env.EDITOR ) return result( [ 500, `Editor is not configured` ] );

        if ( !this.#pkg.isReleasable ) return result( [ 500, `Package is not releasable` ] );

        const git = this.#pkg.git;

        this.#upstream = git.upstream;

        var status = await git.getStatus();
        if ( !status.ok ) return status;
        status = status.data;

        // check branch
        // if ( !status.branch ) return result( [500, `Package is on tbe detached head`] );

        // check for uncommited changes
        if ( status.isDirty ) return result( [ 500, `working copy or sub-repositories has uncommited changes or untracked files` ] );

        this.#previousVersion = status.currentVersion;
        this.#baseVersion = status.currentVersion;

        // get changes
        var changes = await this.#pkg.git.getChanges( this.#baseVersion );
        if ( !changes.ok ) return changes;
        changes = changes.data;

        // define new version
        try {
            this.#newVersion = this.#previousVersion.increment( changes.breakingChanges.length
                ? "major"
                : changes.featureChanges.length
                    ? "minor"
                    : "patch", this.#dropPreRelease
                ? false
                : this.#preRelease );
        }
        catch ( e ) {
            return result.catch( e );
        }

        // make release from pre-release
        if ( this.#baseVersion.isPreRelease && !this.#newVersion.isPreRelease ) {
            res = await this.#pkg.git.getCurrentRelease( { "release": true } );
            if ( !res.ok ) return res;

            this.#baseVersion = res.data.version;

            // update changes
            changes = await this.#pkg.git.getChanges( this.#baseVersion );
            if ( !changes.ok ) return changes;
            changes = changes.data;
        }

        // check, that new version isn't already released
        if ( status.releases.has( this.#newVersion ) ) {
            return result( [
                500,
                `Version "${ this.#newVersion }" is already released.
You need to merge with the "${ this.#newVersion.versionString }" first.`,
            ] );
        }

        // check, that pre-release base isn't already released
        if ( status.releases.has( this.#newVersion.release ) ) {
            return result( [
                500,
                `Version "${ this.#newVersion.release }" is already released.
You need to merge first.`,
            ] );
        }

        // define tags, pre-release version can't have "latest" tag
        this.#latestTag = !this.#newVersion.isPreRelease && this.#newVersion.gt( status.releases.lastStableVersion )
            ? "latest"
            : "";
        this.#nextTag = this.#newVersion.gt( status.releases.lastVersion )
            ? "next"
            : "";

        const latestPreRelease = status.releases.getLastPreRelease( this.#newVersion );

        // new version must be the direct child of the latest pre-release of the new version
        if ( latestPreRelease && !this.#previousVersion.eq( latestPreRelease ) ) {
            return result( [
                500,
                `New release must be the direct child of the release "${ latestPreRelease }", which is already released on the other branch.
You need to merge with the "${ latestPreRelease.versionString }" first.`,
            ] );
        }

        // get sub-packages
        const subPackages = this.#pkg.subPackages;

        // check for pre-released dependencies
        if ( !this.#newVersion.isPreRelease ) {
            for ( const pkg of [ this.#pkg, ...subPackages ] ) {
                const res = pkg.hasPreReleaseDependencies();

                if ( !res.ok ) {
                    console.log( ansi.warn( ` WARNING: ` ) + ` One of releasing packages has pre-released dependencies. It is recommended to use pre-release tag.\n` );

                    continue;
                }
            }
        }

        // confirm empty release
        if ( !changes.size && ( await confirm( "No changes since the latest release. Continue?", [ "yes", "[no]" ] ) ) !== "yes" ) return result( [ 500, "Terminated" ] );

        changes.printReport();
        console.log( "" );

        console.log( `Previous version: ${ ansi.ok( ` ${ this.#baseVersion.versionString } ` ) }${ !this.#baseVersion.eq( this.#previousVersion )
            ? ` ... ${ this.#previousVersion }`
            : "" }` );
        console.log( `New version:      ${ ansi.error( ` ${ this.#newVersion.versionString } ` ) }` );
        console.log( `Tags:             ${ this.#tags }` );
        console.log( "" );

        if ( subPackages.length ) {
            console.log( `Sub-packages found:` );

            subPackages.forEach( pkg => console.log( "  - " + _path.relative( this.#pkg.root, pkg.root ) ) );

            console.log( "" );
        }

        // confirm release
        if ( !this.#yes && ( await confirm( "Continue the release process?", [ "[yes]", "no" ] ) ) !== "yes" ) return result( [ 500, "Terminated" ] );

        var res;

        // run tests
        res = this.#pkg.test( { "log": true } );
        if ( !res.ok ) return res;

        if ( subPackages.length ) {
            for ( const pkg of subPackages ) {
                res = pkg.test( { "log": true } );

                if ( !res.ok ) return res;
            }
        }

        // updating documentation
        const docs = this.#pkg.docs;
        if ( docs.isEnabled ) {
            let res;

            console.log( "" );

            res = await docs.build();
            if ( !res.ok ) return res;

            res = await git.getIsDirty();
            if ( !res.ok ) return res;

            // commit docs
            if ( res.data.isDirty ) {

                // add changes
                res = await git.exec( [ "add", "." ] );
                if ( !res.ok ) return res;

                // commit docs
                res = await repeatAction( async () => {
                    process.stdout.write( "Commiting docs ... " );

                    const res = await git.exec( [ "commit", "-m", `chore: update docs` ] );

                    console.log( res + "" );

                    return res;
                } );
                if ( !res.ok ) return res;
            }
        }

        // update changelog
        res = await this.#updateChangelog( changes );
        if ( !res.ok ) return res;

        // update package version
        this.#pkg.patchVersion( this.#newVersion );

        // update sub-packages versions
        subPackages.forEach( pkg => pkg.patchVersion( this.#newVersion ) );

        // add changes
        process.stdout.write( "Adding changes ... " );
        res = await git.exec( [ "add", "." ] );
        if ( !res.ok ) return res;
        console.log( res + "" );

        // commit
        res = await repeatAction( async () => {
            process.stdout.write( "Commiting ... " );

            const res = await git.exec( [ "commit", "-m", `chore: release ${ this.#newVersion.versionString }` ] );

            console.log( res + "" );

            return res;
        } );
        if ( !res.ok ) return res;

        // set version tag
        res = await repeatAction( async () => {
            process.stdout.write( "Set release tag ... " );

            const res = await git.exec( [ "tag", "-a", this.#newVersion.versionString, "-m", `Release version: ${ this.#newVersion.versionString }` ] );

            console.log( res + "" );

            return res;
        } );
        if ( !res.ok ) return res;

        // set "latest" tag
        if ( this.#latestTag ) {
            res = await repeatAction( async () => {
                process.stdout.write( `Set "${ this.#latestTag }" tag ... ` );

                const res = await git.exec( [ "tag", this.#latestTag, "--force", "-m", "Latest stable release" ] );

                console.log( res + "" );

                return res;
            } );
            if ( !res.ok ) return res;
        }

        // set next tag
        if ( this.#nextTag ) {
            res = await repeatAction( async () => {
                process.stdout.write( `Set "${ this.#nextTag }" tag ... ` );

                const res = await git.exec( [ "tag", this.#nextTag, "--force", "-m", "Next release" ] );

                console.log( res + "" );

                return res;
            } );
            if ( !res.ok ) return res;
        }

        // push, if has upstream
        if ( this.#upstream ) {
            res = await repeatAction( async () => {
                process.stdout.write( "Pushing ... " );

                const params = [ "push", "--atomic", "--force", "origin", status.branch, this.#newVersion.versionString, this.#nextTag, this.#latestTag ].filter( param => param != null && param !== "" );

                const res = await git.exec( params );

                console.log( res + "" );

                return res;
            } );
            if ( !res.ok ) return res;

            // create release on GitHub
            if ( this.#upstream.hosting === "github" && process.env.GITHUB_TOKEN ) {
                const github = new GitHub( process.env.GITHUB_TOKEN );

                res = await repeatAction( async () => {
                    process.stdout.write( "Creating release on GitHub ... " );

                    const res = await github.createRelease( this.#upstream.repositorySlug, this.#newVersion.versionString, {
                        "name": this.#newVersion.versionString,
                        "body": this.#changelog,
                        "prerelease": this.#newVersion.isPreRelease,
                    } );

                    console.log( res + "" );

                    return res;
                } );
                if ( !res.ok ) return res;
            }
        }

        // publish root package
        await this.#pkg.publishNpm( this.#latestTag, this.#nextTag );

        // publish sub-packages
        for ( const pkg of subPackages ) {
            if ( !pkg.isPrivate ) await pkg.publishNpm( this.#latestTag, this.#nextTag );
        }

        return result( 200 );
    }

    // private
    get #tags () {
        const tags = [ this.#latestTag, this.#nextTag ].filter( tag => tag ).join( ", " );

        if ( tags ) return "tags: " + tags;
        else return "tags: -";
    }

    async #updateChangelog ( changes ) {
        var res,
            log = await changes.createChangeLog( {
                "upstream": this.#upstream,
                "previousVersion": this.#baseVersion,
                "newVersion": this.#newVersion,
            } );

        while ( true ) {
            if ( !this.#yes ) {
                const tmp = new TmpFile( { "extname": ".md" } );

                fs.writeFileSync( tmp.path, log );

                res = childProcess.spawnSync( process.env.EDITOR, [ `"${ tmp.path }"` ], {
                    "shell": true,
                    "stdio": "inherit",
                } );

                if ( res.status ) return result( [ 500, "Unable to create changelog" ] );

                log = fs.readFileSync( tmp.path, "utf8" );

                tmp.destroy();
            }

            // lint
            res = await lintFile( new File( {
                "path": this.#pkg.root + "/CHANGELOG.md",
                "buffer": log,
            } ) );
            if ( !res.ok ) return result( [ 500, `Error linting "CHANGELOG.md"` ] );

            log = res.data;

            console.log( `\n${ ansi.hl( "# Changelog:" ) }\n\n${ new Markdown( log ).toString( { "ansi": true } ) }` );

            // confirm release
            if ( !this.#yes ) {
                res = await confirm( "Continue the release process?", [ "edit", "[yes]", "no" ] );

                if ( res === "edit" ) {
                    continue;
                }
                else if ( res !== "yes" ) {
                    return result( [ 500, "Terminated" ] );
                }
            }

            break;
        }

        this.#changelog = log;

        log = "# Changelog\n\n" + log;

        // prepend log
        if ( await exists( this.#pkg.root + "/CHANGELOG.md" ) ) {
            const currentLog = fs
                .readFileSync( this.#pkg.root + "/CHANGELOG.md", "utf8" )
                .replace( /# Changelog/, "" )
                .trim();

            log += "\n" + currentLog + "\n";
        }

        // write
        fs.writeFileSync( this.#pkg.root + "/CHANGELOG.md", this.#upstream
            ? this.#upstream.linkifyMessage( log )
            : log );

        return result( 200 );
    }
}
