import childProcess from "node:child_process";
import fs from "node:fs";
import _path from "node:path";
import GitHub from "#core/api/github";
import ejs from "#core/ejs";
import env from "#core/env";
import File from "#core/file";
import { exists } from "#core/fs";
import ansi from "#core/text/ansi";
import { TmpFile } from "#core/tmp";
import { confirm, resolve } from "#core/utils";
import { lintFile } from "#lib/lint";

export default class Publish {
    #pkg;
    #preRelease;
    #yes;
    #dropPreRelease;

    #version;
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

        if ( this.#pkg.cliConfig.private === true ) return result( [ 500, `Package is private` ] );

        const git = this.#pkg.git;

        this.#upstream = git.upstream;

        var status = await git.getStatus();
        if ( !status.ok ) return status;
        status = status.data;

        // check branch
        // if ( !status.branch ) return result( [500, `Package is on tbe detached head`] );

        // check for uncommited changes
        if ( status.isDirty ) return result( [ 500, `working copy or sub-repositories has uncommited changes or untracked files` ] );

        // check distance from the last release
        if ( status.currentVersion && !status.currentVersionDistance && ( await confirm( "No changes since the latest release. Continue?", [ "no", "yes" ] ) ) === "no" ) return result( [ 500, "Terminated" ] );

        this.#version = status.currentVersion;

        // get changes
        var changes = await this.#pkg.git.getChanges( this.#version );
        if ( !changes.ok ) return changes;
        changes = changes.data;

        changes.report();
        console.log( "" );

        try {
            this.#newVersion = this.#version.increment( changes.breakingChanges.length
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

        // check, that new version isn't already released
        if ( status.releases.has( this.#newVersion ) ) {
            return result( [
                500,
                `Version "${ this.#newVersion }" is already released.
You need to merge with the "${ this.#newVersion.toVersionString() }" first.`,
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
        if ( latestPreRelease && !this.#version.eq( latestPreRelease ) ) {
            return result( [
                500,
                `New release must be the direct child of the release "${ latestPreRelease }", which is already released on the other branch.
You need to merge with the "${ latestPreRelease.toVersionString() }" first.`,
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

        console.log( `Current version: ${ ansi.ok( " " + this.#version + " " ) }` );
        console.log( `Release version: ${ ansi.error( " " + this.#newVersion + " " ) }, ${ this.#tags }` );
        console.log( "" );

        if ( subPackages.length ) {
            console.log( `Sub-packages found:` );

            subPackages.forEach( pkg => console.log( "  - " + _path.relative( this.#pkg.root, pkg.root ) ) );

            console.log( "" );
        }

        // confirm release
        if ( !this.#yes && ( await confirm( "Continue release process?", [ "no", "yes" ] ) ) === "no" ) return result( [ 500, "Terminated" ] );

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
        if ( docs.isExists ) {
            console.log( "" );
            const res = await docs.build();
            if ( !res.ok ) return res;
        }

        // update changelog
        res = await this.#updateChangelog( changes );
        if ( !res.ok ) return res;

        // update version
        this.#pkg.patchVersion( this.#newVersion );

        // update sub-packages versions
        subPackages.forEach( pkg => pkg.patchVersion( this.#newVersion ) );

        // add changes
        process.stdout.write( "Adding changes ... " );
        res = await git.run( "add", "." );
        if ( !res.ok ) return res;
        console.log( res + "" );

        // commit
        while ( true ) {
            process.stdout.write( "Commiting ... " );

            res = await git.run( "commit", "-m", `chore: release ${ this.#newVersion.toVersionString() }` );

            console.log( res + "" );

            if ( res.ok ) break;

            if ( ( await confirm( "Repeat?", [ "yes", "no" ] ) ) === "no" ) return res;
        }

        // set version tag
        while ( true ) {
            process.stdout.write( "Set release tag ... " );

            res = await git.run( "tag", "-a", this.#newVersion.toVersionString(), "-m", `Release version: ${ this.#newVersion.toVersionString() }` );

            console.log( res + "" );

            if ( res.ok ) break;

            if ( ( await confirm( "Repeat?", [ "yes", "no" ] ) ) === "no" ) return res;
        }

        // set "latest" tag
        if ( this.#latestTag ) {
            while ( true ) {
                process.stdout.write( `Set "${ this.#latestTag }" tag ... ` );

                res = await git.run( "tag", this.#latestTag, "--force", "-m", "Latest stable release" );

                console.log( res + "" );

                if ( res.ok ) break;

                if ( ( await confirm( "Repeat?", [ "yes", "no" ] ) ) === "no" ) return res;
            }
        }

        // set next tag
        if ( this.#nextTag ) {
            while ( true ) {
                process.stdout.write( `Set "${ this.#nextTag }" tag ... ` );

                res = await git.run( "tag", this.#nextTag, "--force", "-m", "Next release" );

                console.log( res + "" );

                if ( res.ok ) break;

                if ( ( await confirm( "Repeat?", [ "yes", "no" ] ) ) === "no" ) return res;
            }
        }

        // push, if has upstream
        if ( this.#upstream ) {
            while ( true ) {
                process.stdout.write( "Pushing ... " );

                const params = [ "push", "--atomic", "--force", "origin", status.branch, this.#newVersion.toVersionString(), this.#nextTag, this.#latestTag ].filter( param => param != null && param !== "" );

                res = await git.run( ...params );

                console.log( res + "" );

                if ( !res.ok ) {
                    if ( ( await confirm( "Repeat?", [ "yes", "no" ] ) ) === "no" ) break;
                }
                else {
                    break;
                }
            }

            if ( this.#upstream.hosting === "github" && process.env.GITHUB_TOKEN ) {
                const github = new GitHub( process.env.GITHUB_TOKEN );

                while ( true ) {
                    process.stdout.write( "Creating release on GitHub ... " );

                    res = await github.createRelease( this.#upstream.repoId, this.#newVersion.toVersionString(), {
                        "name": this.#newVersion.toVersionString(),
                        "body": this.#changelog,
                        "prerelease": this.#newVersion.isPreRelease,
                    } );

                    console.log( res + "" );

                    if ( !res.ok ) {
                        if ( ( await confirm( "Repeat?", [ "yes", "no" ] ) ) === "no" ) break;
                    }
                    else {
                        break;
                    }
                }
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
        var log = await ejs.renderFile( resolve( "#resources/templates/changelog.md.ejs", import.meta.url ), {
            changes,
            "compareUrl": this.#version.isNull
                ? null
                : this.#upstream?.getCompareUrl( this.#version.toVersionString(), this.#newVersion.toVersionString() ),
            "previousVersion": this.#version,
            "newVersion": this.#newVersion,
        } );

        if ( !this.#yes ) {
            const tmp = new TmpFile( { "extname": ".md" } );

            fs.writeFileSync( tmp.path, log );

            var res = childProcess.spawnSync( process.env.EDITOR, [ `"${ tmp.path }"` ], {
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

        console.log( `\n${ ansi.hl( "# Changelog:" ) }\n\n${ log }` );

        // confirm release
        if ( !this.#yes && ( await confirm( "Continue release process?", [ "no", "yes" ] ) ) === "no" ) return result( [ 500, "Terminated" ] );

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
