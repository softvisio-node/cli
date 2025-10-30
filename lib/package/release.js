import childProcess from "node:child_process";
import fs from "node:fs";
import _path from "node:path";
import ansi from "#core/ansi";
import GitHub from "#core/api/github";
import env from "#core/env";
import File from "#core/file";
import { exists } from "#core/fs";
import SemanticVersion from "#core/semantic-version";
import { TmpFile } from "#core/tmp";
import { confirm, repeatAction, shellEscape } from "#core/utils";
import { lintFile } from "#lib/lint";

export default class Publish {
    #pkg;
    #preReleaseTag;
    #stable;
    #yes;

    #currentRelease;
    #changelog;
    #changelogMarkdown;
    #changelogText;
    #latestTag;
    #nextTag;

    constructor ( pkg, { preReleaseTag, yes } = {} ) {
        this.#pkg = pkg;
        this.#preReleaseTag = preReleaseTag;
        this.#yes = Boolean( yes );

        if ( this.#preReleaseTag === "stable" ) {
            this.#preReleaseTag = null;
            this.#stable = true;
        }
        else {
            this.#stable = false;
        }
    }

    // public
    async run () {
        var res;

        console.log( "Releasing package:", ansi.hl( this.#pkg.workspaceSlug ), "\n" );

        // get changelog
        res = await this.getChangelog();
        if ( !res.ok ) return res;

        env.loadUserEnv();

        // check user config
        if ( !process.env.EDITOR ) return result( [ 500, "Editor is not configured" ] );

        if ( !this.#pkg.isReleaseEnabled ) return result( [ 500, "Package release is disabled" ] );

        res = await this.#pkg.git.getStatus();
        if ( !res.ok ) return res;
        const status = res.data;

        // check branch
        if ( !status.head.isBranchHead ) {
            return result( [ 500, "Release on tbe detached head is not possible" ] );
        }

        if ( !this.#pkg.cliConfig.release.branches.includes( status.head.branch ) ) {
            return result( [ 500, `Release on branch "${ status.head.branch }" is not allowed` ] );
        }

        // check for uncommited changes
        if ( status.isDirty ) return result( [ 500, "working copy or sub-repositories has uncommited changes or untracked files" ] );

        // define new version
        res = this.#changelog.getNextVersion( this.#stable
            ? false
            : this.#preReleaseTag );
        if ( !res.ok ) return res;
        this.#currentRelease = res.data;

        // check version can be released
        res = status.releases.canRelease( this.#currentRelease );
        if ( !res.ok ) return res;

        // get sub-packages
        const subPackages = this.#pkg.subPackages;

        // check for pre-release dependencies
        if ( this.#currentRelease.isStableRelease ) {
            for ( const pkg of [ this.#pkg, ...subPackages ] ) {
                const res = pkg.checkPreReleaseDependencies();

                if ( !res.ok ) return res;
            }
        }

        // define tags, pre-release version can't have "latest" tag
        this.#latestTag = !this.#currentRelease.isPreRelease && this.#currentRelease.gt( status.releases.lastStableRelease || SemanticVersion.initialVersion )
            ? "latest"
            : "";

        this.#nextTag = this.#currentRelease.gt( status.releases.lastRelease || SemanticVersion.initialVersion )
            ? "next"
            : "";

        console.log( this.#changelog.createReport() );
        console.log();

        console.log( `New version:      ${ ansi.underline( this.#currentRelease.versionString ) }, tags: ${ this.#createTagsText() || "-" }` );
        console.log( `Previous version: ${ this.#changelog.previousRelease?.versionString || "-" }` );
        console.log();

        if ( subPackages.length ) {
            console.log( "Sub-packages found:" );

            subPackages.forEach( pkg => console.log( "  - " + _path.relative( this.#pkg.root, pkg.root ) ) );

            console.log();
        }

        // confirm no changes
        if ( !this.#changelog.hasChanges ) {
            res = await confirm( "No changes since the previous release.\nContinue the release process?", [ "yes", "[no]" ] );

            if ( res !== "yes" ) return result( [ 400, "Terminated" ] );
        }

        // confirm no notable changes
        else if ( !this.#yes && !this.#changelog.hasNotableChanges ) {
            res = await confirm( "No notable changes since the previous release.\nContinue the release process?", [ "yes", "[no]" ] );

            if ( res !== "yes" ) return result( [ 400, "Terminated" ] );
        }

        // confirm release
        else if ( !this.#yes ) {
            res = await confirm( "Continue the release process?", [ "[yes]", "no" ] );

            if ( res !== "yes" ) return result( [ 400, "Terminated" ] );
        }

        console.log();

        // run tests
        res = this.#pkg.test( { "log": true } );
        if ( !res.ok ) return res;

        if ( subPackages.length ) {
            for ( const pkg of subPackages ) {
                res = pkg.test( { "log": true } );

                if ( !res.ok ) return res;
            }
        }

        // update documentation
        res = await this.#updateDocs();
        if ( !res.ok ) return res;

        // update changelog
        res = await this.#updateChangelog();
        if ( !res.ok ) return res;

        // update package version
        this.#pkg.patchVersion( this.#currentRelease );

        // update sub-packages versions
        subPackages.forEach( pkg => pkg.patchVersion( this.#currentRelease ) );

        // add changes
        process.stdout.write( "Adding changes ... " );
        res = await this.#pkg.git.exec( [ "add", "." ] );
        if ( !res.ok ) return res;
        console.log( res + "" );

        // commit
        res = await repeatAction( async () => {
            process.stdout.write( "Commiting ... " );

            const res = await this.#pkg.git.exec( [ "commit", "--cleanup=verbatim", "-m", `build(release): release ${ this.#currentRelease.versionString }\n\n${ this.#changelogText }\n` ] );

            console.log( res + "" );

            return res;
        } );
        if ( !res.ok ) return res;

        // set version tag
        res = await repeatAction( async () => {
            process.stdout.write( "Adding release tag ... " );

            const res = await this.#pkg.git.exec( [ "tag", "--cleanup=verbatim", "-a", "-m", `Release ${ this.#currentRelease.versionString }\n\n${ this.#changelogText }\n`, this.#currentRelease.versionString ] );

            console.log( res + "" );

            return res;
        } );
        if ( !res.ok ) return res;

        // set "latest" tag
        if ( this.#latestTag ) {
            res = await repeatAction( async () => {
                process.stdout.write( `Adding "${ this.#latestTag }" tag ... ` );

                const res = await this.#pkg.git.exec( [ "tag", "--force", "-a", "-m", "Latest stable release", this.#latestTag ] );

                console.log( res + "" );

                return res;
            } );
            if ( !res.ok ) return res;
        }

        // set next tag
        if ( this.#nextTag ) {
            res = await repeatAction( async () => {
                process.stdout.write( `Adding "${ this.#nextTag }" tag ... ` );

                const res = await this.#pkg.git.exec( [ "tag", "--force", "-a", "-m", "Next release", this.#nextTag ] );

                console.log( res + "" );

                return res;
            } );
            if ( !res.ok ) return res;
        }

        // push, if has upstream
        if ( this.#pkg.git.upstream ) {
            res = await repeatAction( async () => {
                process.stdout.write( "Pushing ... " );

                const params = [ "push", "--atomic", "--force", "origin", status.head.branch, this.#currentRelease.versionString, this.#nextTag, this.#latestTag ].filter( param => param != null && param !== "" );

                const res = await this.#pkg.git.exec( params );

                console.log( res + "" );

                return res;
            } );
            if ( !res.ok ) return res;

            // create release on GitHub
            if ( this.#pkg.git.upstream.hosting === "github" && process.env.GITHUB_TOKEN ) {
                const github = new GitHub( process.env.GITHUB_TOKEN );

                res = await repeatAction( async () => {
                    process.stdout.write( "Creating release on GitHub ... " );

                    const res = await github.createRelease( this.#pkg.git.upstream.repositorySlug, this.#currentRelease.versionString, {
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

    async getChangelog ( { force } = {} ) {
        if ( force || !this.#changelog ) {
            this.#changelog = null;

            // get changes
            const res = await this.#pkg.git.getChangelog( {
                "release": true,
                "stable": this.#stable,
                "commitTypes": this.#pkg.cliConfig?.commits.types,
            } );

            if ( !res.ok ) return res;

            this.#changelog = res.data;
        }

        return result( 200, this.#changelog );
    }

    // private
    #createTagsText () {
        const tags = [ this.#latestTag, this.#nextTag ]
            .filter( tag => tag )
            .map( tag => "🏷 " + ansi.underline( tag ) )
            .join( ", " );

        if ( tags ) {
            return tags;
        }
        else {
            return "-";
        }
    }

    async #updateDocs () {
        const docs = this.#pkg.docs;

        if ( !docs.isEnabled ) return result( 200 );

        var res;

        console.log();

        res = await docs.build();
        if ( !res.ok ) return res;

        res = await this.#pkg.git.getWorkingTreeStatus();
        if ( !res.ok ) return res;

        // commit docs
        if ( res.data.isDirty ) {

            // add changes
            res = await repeatAction( async () => {
                process.stdout.write( "Adding documentation ... " );

                const res = await this.#pkg.git.exec( [ "add", "." ] );

                console.log( res + "" );

                return res;
            } );
            if ( !res.ok ) return res;

            // commit docs
            res = await repeatAction( async () => {
                process.stdout.write( "Commiting documentation ... " );

                const res = await this.#pkg.git.exec( [ "commit", "-m", "docs: update docs" ] );

                console.log( res + "" );

                return res;
            } );
            if ( !res.ok ) return res;

            // update changelog
            res = this.getChangelog( { "force": true } );
            if ( !res.ok ) return res;
        }

        return result( 200 );
    }

    async #updateChangelog () {
        var res,
            changelogMarkdown = await this.#changelog.createChangelog( {
                "currentRelease": this.#currentRelease,
            } );

        while ( true ) {

            // lint
            res = await lintFile( new File( {
                "path": this.#pkg.root + "/CHANGELOG.md",
                "type": "text/markdown",
                "buffer": changelogMarkdown,
            } ) );
            if ( !res.ok ) return result( [ 500, `Error linting "CHANGELOG.md"` ] );

            changelogMarkdown = res.data;

            console.log( `\n${ this.#changelog.convertMarkdownToText( "# Changelog:\n\n" + changelogMarkdown, {
                "ansi": true,
                "linkify": true,
            } ) }\n` );

            // confirm release
            if ( !this.#yes ) {
                res = await confirm( "Continue the release process?", [ "(e)dit changelog", "[yes]", "no" ] );

                if ( res === "edit changelog" ) {
                    res = await this.#editChangelog( changelogMarkdown );
                    if ( !res.ok ) return res;

                    changelogMarkdown = res.data;

                    continue;
                }
                else if ( res !== "yes" ) {
                    return result( [ 400, "Terminated" ] );
                }

                console.log();
            }

            break;
        }

        this.#changelogMarkdown = changelogMarkdown;
        this.#changelogText = this.#changelog.convertMarkdownToText( changelogMarkdown, {
            "ansi": false,
            "linkify": false,
        } );

        var fullChangelog = `
# Changelog

### ${ this.#currentRelease.versionString } (${ this.#currentRelease.changelogDate })

${ this.#changelog.linkifyMarkdown( changelogMarkdown ) }
`.trim();

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

    async #editChangelog ( changelogMarkdown ) {
        const tmp = new TmpFile( { "extname": ".md" } );

        fs.writeFileSync( tmp.path, changelogMarkdown );

        const res = childProcess.spawnSync( shellEscape( [ process.env.EDITOR, tmp.path ] ), {
            "shell": true,
            "stdio": "inherit",
        } );

        if ( res.status ) return result( [ 500, "Unable to create changelog" ] );

        changelogMarkdown = fs.readFileSync( tmp.path, "utf8" );

        tmp.destroy();

        return result( 200, changelogMarkdown );
    }
}
