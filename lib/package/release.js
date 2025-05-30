import childProcess from "node:child_process";
import fs from "node:fs";
import _path from "node:path";
import GitRelease from "#core/api/git/release";
import GitHub from "#core/api/github";
import env from "#core/env";
import File from "#core/file";
import { exists } from "#core/fs";
import Markdown from "#core/markdown";
import SemanticVersion from "#core/semantic-version";
import ansi from "#core/text/ansi";
import { TmpFile } from "#core/tmp";
import { confirm, repeatAction } from "#core/utils";
import { lintFile } from "#lib/lint";

export default class Publish {
    #pkg;
    #preRelease;
    #stable;
    #yes;

    #upstream;
    #currentRelease;
    #changelog;
    #changelogMarkdown;
    #changelogText;
    #latestTag;
    #nextTag;

    constructor ( pkg, { preRelease, yes } = {} ) {
        this.#pkg = pkg;
        this.#preRelease = preRelease;
        this.#yes = !!yes;

        if ( this.#preRelease === "stable" ) {
            this.#preRelease = null;
            this.#stable = true;
        }
        else {
            this.#stable = false;
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

        var res;

        res = await git.getStatus();
        if ( !res.ok ) return res;
        const status = res.data;

        // check branch
        if ( !status.head.isBranchHead ) return result( [ 500, "Release on tbe detached head is not possible" ] );

        // check for uncommited changes
        if ( status.isDirty ) return result( [ 500, `working copy or sub-repositories has uncommited changes or untracked files` ] );

        // get changes
        res = await this.#pkg.git.getChangelog( {
            "release": true,
            "stable": this.#stable,
        } );
        if ( !res.ok ) return res;
        this.#changelog = res.data;

        // define new version
        try {
            this.#currentRelease = ( this.#changelog.previousRelease || GitRelease.initialVersion ).increment( this.#changelog.hasBreakingChanges
                ? "major"
                : this.#changelog.hasFeatureChanges
                    ? "minor"
                    : "patch", this.#stable
                ? false
                : this.#preRelease );
        }
        catch ( e ) {
            return result.catch( e, { "log": false } );
        }

        // check version can be released
        res = status.releases.canRelease( this.#currentRelease );
        if ( !res.ok ) return res;

        // get sub-packages
        const subPackages = this.#pkg.subPackages;

        // check for pre-released dependencies
        if ( !this.#currentRelease.isPreRelease ) {
            for ( const pkg of [ this.#pkg, ...subPackages ] ) {
                const res = pkg.hasPreReleaseDependencies();

                if ( !res.ok ) {
                    console.log( ansi.warn( ` WARNING: ` ) + ` One of releasing packages has pre-released dependencies. It is recommended to use pre-release tag.\n` );

                    continue;
                }
            }
        }

        // define tags, pre-release version can't have "latest" tag
        this.#latestTag = !this.#currentRelease.isPreRelease && this.#currentRelease.gt( status.releases.lastStableRelease || SemanticVersion.initialVersion )
            ? "latest"
            : "";

        this.#nextTag = this.#currentRelease.gt( status.releases.lastRelease || SemanticVersion.initialVersion )
            ? "next"
            : "";

        // confirm empty release
        if ( !this.#changelog.hasChanges && ( await confirm( "No changes since the latest release. Continue?", [ "yes", "[no]" ] ) ) !== "yes" ) return result( [ 500, "Terminated" ] );

        console.log( this.#changelog.createReport() );
        console.log( "" );

        console.log( `Previous version:  ${ this.#changelog.previousRelease?.versionString || "-" }` );
        console.log( `New version:      ${ ansi.ok( ` ${ this.#currentRelease.versionString } ` ) }` );
        console.log( `Tags:              ${ this.#tags }` );
        console.log( "" );

        if ( subPackages.length ) {
            console.log( `Sub-packages found:` );

            subPackages.forEach( pkg => console.log( "  - " + _path.relative( this.#pkg.root, pkg.root ) ) );

            console.log( "" );
        }

        // confirm release
        if ( !this.#yes && ( await confirm( "Continue the release process?", [ "[yes]", "no" ] ) ) !== "yes" ) return result( [ 500, "Terminated" ] );

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
        res = await this.#updateChangelog();
        if ( !res.ok ) return res;

        // update package version
        this.#pkg.patchVersion( this.#currentRelease );

        // update sub-packages versions
        subPackages.forEach( pkg => pkg.patchVersion( this.#currentRelease ) );

        // add changes
        process.stdout.write( "Adding changes ... " );
        res = await git.exec( [ "add", "." ] );
        if ( !res.ok ) return res;
        console.log( res + "" );

        // commit
        res = await repeatAction( async () => {
            process.stdout.write( "Commiting ... " );

            const res = await git.exec( [ "commit", "--cleanup=verbatim", "-m", `chore: release ${ this.#currentRelease.versionString }\n\n${ this.#changelogText }` ] );

            console.log( res + "" );

            return res;
        } );
        if ( !res.ok ) return res;

        // set version tag
        res = await repeatAction( async () => {
            process.stdout.write( "Set release tag ... " );

            const res = await git.exec( [ "tag", "--cleanup=verbatim", "-a", "-m", `Release ${ this.#currentRelease.versionString }\n\n${ this.#changelogText }`, this.#currentRelease.versionString ] );

            console.log( res + "" );

            return res;
        } );
        if ( !res.ok ) return res;

        // set "latest" tag
        if ( this.#latestTag ) {
            res = await repeatAction( async () => {
                process.stdout.write( `Set "${ this.#latestTag }" tag ... ` );

                const res = await git.exec( [ "tag", "--cleanup=verbatim", "--force", "-a", "-m", "Latest stable release", this.#latestTag ] );

                console.log( res + "" );

                return res;
            } );
            if ( !res.ok ) return res;
        }

        // set next tag
        if ( this.#nextTag ) {
            res = await repeatAction( async () => {
                process.stdout.write( `Set "${ this.#nextTag }" tag ... ` );

                const res = await git.exec( [ "tag", "--cleanup=verbatim", "--force", "-a", "-m", "Next release", this.#nextTag ] );

                console.log( res + "" );

                return res;
            } );
            if ( !res.ok ) return res;
        }

        // push, if has upstream
        if ( this.#upstream ) {
            res = await repeatAction( async () => {
                process.stdout.write( "Pushing ... " );

                const params = [ "push", "--atomic", "--force", "origin", status.head.branch, this.#currentRelease.versionString, this.#nextTag, this.#latestTag ].filter( param => param != null && param !== "" );

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

                    const res = await github.createRelease( this.#upstream.repositorySlug, this.#currentRelease.versionString, {
                        "name": this.#currentRelease.versionString,
                        "body": this.#changelogMarkdown,
                        "prerelease": this.#currentRelease.isPreRelease,
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

        if ( tags ) {
            return tags;
        }
        else {
            return "-";
        }
    }

    async #updateChangelog () {
        var res,
            changelogMarkdown = await this.#changelog.createChangelog( {
                "currentRelease": this.#currentRelease,
            } );

        while ( true ) {
            if ( !this.#yes ) {
                const tmp = new TmpFile( { "extname": ".md" } );

                fs.writeFileSync( tmp.path, changelogMarkdown );

                res = childProcess.spawnSync( process.env.EDITOR, [ `"${ tmp.path }"` ], {
                    "shell": true,
                    "stdio": "inherit",
                } );

                if ( res.status ) return result( [ 500, "Unable to create changelog" ] );

                changelogMarkdown = fs.readFileSync( tmp.path, "utf8" );

                tmp.destroy();
            }

            // lint
            res = await lintFile( new File( {
                "path": this.#pkg.root + "/CHANGELOG.md",
                "type": "text/markdown",
                "buffer": changelogMarkdown,
            } ) );
            if ( !res.ok ) return result( [ 500, `Error linting "CHANGELOG.md"` ] );

            changelogMarkdown = res.data;

            console.log( `\n${ ansi.hl( "# Changelog:" ) }\n\n${ new Markdown( changelogMarkdown ).toString( { "ansi": true } ) }` );

            // confirm release
            if ( !this.#yes ) {
                res = await confirm( "Continue the release process?", [ "(e)dit changelog", "[yes]", "no" ] );
                if ( res === "edit changelog" ) {
                    continue;
                }
                else if ( res !== "yes" ) {
                    return result( [ 500, "Terminated" ] );
                }
            }

            break;
        }

        this.#changelogMarkdown = changelogMarkdown;
        this.#changelogText = new Markdown( changelogMarkdown ).toString( { "ansi": false } );

        var fullChangelog = "# Changelog\n\n" + changelogMarkdown;

        // linkify changelog
        if ( this.#upstream ) {
            fullChangelog = this.#upstream.linkifyMessage( fullChangelog );
        }

        // patch CHANGELOG.md
        if ( await exists( this.#pkg.root + "/CHANGELOG.md" ) ) {
            fullChangelog +=
                "\n" +
                fs
                    .readFileSync( this.#pkg.root + "/CHANGELOG.md", "utf8" )
                    .replace( /# Changelog\n/, "" )
                    .trim() +
                "\n";
        }

        // write CHANGELOG.md
        fs.writeFileSync( this.#pkg.root + "/CHANGELOG.md", fullChangelog );

        return result( 200 );
    }
}
