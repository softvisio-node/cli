import { confirm, resolve } from "#core/utils";
import env from "#core/env";
import ansi from "#core/text/ansi";
import fs from "fs";
import child_process from "child_process";
import LintFile from "#lib/lint/file";
import GitHub from "#core/api/github";
import File from "#core/file";
import { TmpFile } from "#core/tmp";
import ejs from "#core/ejs";

export default class Publish {
    #pkg;
    #preRelease;
    #dropPreRelease;

    #userConfig;
    #version;
    #newVersion;
    #upstream;
    #changelog;
    #latestTag;
    #nextTag;

    constructor ( pkg, preRelease ) {
        this.#pkg = pkg;
        this.#preRelease = preRelease;

        if ( this.#preRelease === "release" ) {
            this.#preRelease = null;
            this.#dropPreRelease = true;
        }
    }

    // public
    async run () {
        this.#userConfig = await env.getUserConfig();

        // check user config
        if ( !this.#userConfig.editor ) return result( [500, `editor is not configured`] );

        const git = this.#pkg.git;

        var status = await git.getStatus();
        if ( !status.ok ) return status;
        status = status.data;

        // check branch
        // if ( !status.branch ) return result( [500, `project is on tbe detached head`] );

        // check for uncommited changes
        if ( status.isDirty ) return result( [500, `working copy or sub-repositories has uncommited changes or untracked files`] );

        // check distance from the last release
        if ( status.currentVersion && !status.currentVersionDistance && ( await confirm( "No changes since the latest release. Continue?", ["n", "y"] ) ) === "n" ) return result( [500, "terminated"] );

        this.#version = status.currentVersion;

        // get changes
        var changes = await this.#pkg.git.getChanges( this.#version );
        if ( !changes.ok ) return changes;
        changes = changes.data;

        changes.report();
        console.log( "" );

        // first release
        if ( this.#version.isNull ) {
            this.#newVersion = this.#version.inc( "major", this.#preRelease );
        }

        // major
        else if ( changes.breaking.length ) {
            if ( this.#version.isPreRelease && this.#version.isMajor ) {
                this.#newVersion = this.#version.inc( "prerelease", this.#preRelease );
            }
            else {
                this.#newVersion = this.#version.inc( "major", this.#preRelease );
            }
        }

        // minor
        else if ( changes.feat.length ) {
            if ( this.#version.isPreRelease && !this.#version.isPatch ) {
                this.#newVersion = this.#version.inc( "prerelease", this.#preRelease );
            }
            else {
                this.#newVersion = this.#version.inc( "minor", this.#preRelease );
            }
        }

        // patch
        else {
            if ( this.#version.isPreRelease ) {
                this.#newVersion = this.#version.inc( "prerelease", this.#preRelease );
            }
            else {
                this.#newVersion = this.#version.inc( "patch", this.#preRelease );
            }
        }

        // drop pre-release
        if ( this.#dropPreRelease ) this.#newVersion = this.#newVersion.base;

        // check, that new version > old version (required to compare pre-releases)
        if ( !this.#newVersion.gt( this.#version ) ) {
            return result( [500, `new version "${this.#newVersion}" should be greater than old version "${this.#version}"`] );
        }

        // check, that new version isn't already released
        if ( status.releases.has( this.#newVersion ) ) {
            return result( [
                500,
                `Version "${this.#newVersion}" is already released on the other branch.
You need to merge with the "${this.#newVersion.toVersionString()}" first.`,
            ] );
        }

        // check, that pre-release base isn't already released
        if ( status.releases.has( this.#newVersion.base ) ) {
            return result( [
                500,
                `Version "${this.#newVersion.base}" is already released on the other branch.
You need to merge first.`,
            ] );
        }

        // define tags, pre-release version can't have "latest" tag
        this.#latestTag = !this.#newVersion.isPreRelease && this.#newVersion.gt( status.releases.lastStableVersion ) ? "latest" : "";
        this.#nextTag = this.#newVersion.gt( status.releases.lastVersion ) ? "next" : "";

        const latestPreRelease = status.releases.getLastPreRelease( this.#newVersion );

        // new version must be the direct child of the latest pre-release of the new version
        if ( latestPreRelease && !this.#version.eq( latestPreRelease ) ) {
            return result( [
                500,
                `New release must be the direct child of the release "${latestPreRelease}", which is already released on the other branch.
You need to merge with the "${latestPreRelease.toVersionString()}" first.`,
            ] );
        }

        // get linked workspaces
        const packages = this.#pkg.packages;

        // check for pre-released dependencies
        if ( !this.#newVersion.isPreRelease ) {
            for ( const pkg of [this.#pkg, ...packages] ) {
                const res = pkg.hasPreReleaseDepth();

                if ( !res.ok ) {
                    console.log( ansi.warn( ` WARNING: ` ) + ` One of releasing packages has pre-released dependencies. It is recommended to use pre-release tag.\n` );

                    continue;
                }
            }
        }

        console.log( `Current version: ${ansi.ok( " " + this.#version + " " )}` );
        console.log( `Release version: ${ansi.error( " " + this.#newVersion + " " )}, ${this.#tags}` );
        console.log( "" );

        if ( packages.length ) {
            console.log( `Packages found:` );

            packages.forEach( pkg => console.log( "  - " + pkg.relativePath ) );

            console.log( "" );
        }

        // confirm release
        if ( ( await confirm( "Continue release process?", ["n", "y"] ) ) === "n" ) return result( [500, "terminated"] );

        var res;

        // run tests
        // console.log( "Run tests:" );

        // res = await this.#pkg.test( { "log": false, "bail": true } );
        // if ( !res.ok ) return result( [500, "tests failed"] );

        // for ( const pkg of packages ) {
        //     res = await pkg.test( { "log": false, "bail": true } );
        //     if ( !res.ok ) return result( [500, "tests failed"] );
        // }

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

        // update linked workspaces version
        packages.forEach( pkg => pkg.patchVersion( this.#newVersion ) );

        // add changes
        process.stdout.write( "Adding changes ... " );
        res = await git.run( "add", "." );
        if ( !res.ok ) return res;
        console.log( res + "" );

        // commit
        process.stdout.write( "Commiting ... " );
        res = await git.run( "commit", "-m", `release: ${this.#newVersion.toVersionString()}` );
        if ( !res.ok ) return res;
        console.log( res + "" );

        // set version tag
        process.stdout.write( "Setting tags ... " );
        res = await git.run( "tag", "-a", `${this.#newVersion.toVersionString()}`, "-m", `Released version: ${this.#newVersion.toVersionString()}` );
        if ( !res.ok ) return res;

        // set "latest" tag
        if ( this.#latestTag ) {
            res = await git.run( "tag", this.#latestTag, "--force" );
            if ( !res.ok ) return res;
        }

        // set next tag
        if ( this.#nextTag ) {
            res = await git.run( "tag", this.#nextTag, "--force" );
            if ( !res.ok ) return res;
        }

        console.log( res + "" );

        this.#upstream = await git.getUpstream();

        // push, if has upstream
        if ( this.#upstream ) {
            while ( 1 ) {
                process.stdout.write( "Pushing ... " );

                const params = ["push", "--atomic", "--force", "origin", status.branch, this.#newVersion.toVersionString(), this.#nextTag, this.#latestTag].filter( param => param != null && param !== "" );

                res = await git.run( ...params );

                console.log( res + "" );

                if ( !res.ok ) {
                    if ( ( await confirm( "Repeat?", ["y", "n"] ) ) === "n" ) break;
                }
                else {
                    break;
                }
            }

            if ( this.#upstream.hosting === "github" && this.#userConfig.github?.token ) {
                const github = new GitHub( this.#userConfig.github.token );

                while ( 1 ) {
                    process.stdout.write( "Creating release on GitHub ... " );

                    res = await github.createRelease( this.#upstream.repoId, this.#newVersion.toVersionString(), {
                        "name": this.#newVersion.toVersionString(),
                        "body": this.#changelog,
                        "prerelease": this.#newVersion.isPreRelease,
                    } );

                    console.log( res + "" );

                    if ( !res.ok ) {
                        if ( ( await confirm( "Repeat?", ["y", "n"] ) ) === "n" ) break;
                    }
                    else {
                        break;
                    }
                }
            }
        }

        // publish root package
        await this.#pkg.publishNPM( this.#latestTag, this.#nextTag );

        // publish linked workspaces
        for ( const pkg of packages ) {
            if ( !pkg.isPrivate ) await pkg.publishNPM( this.#latestTag, this.#nextTag );
        }

        return result( 200 );
    }

    // private
    get #tags () {
        const tags = [this.#latestTag, this.#nextTag].filter( tag => tag ).join( ", " );

        if ( tags ) return "tags: " + tags;
        else return "tags: -";
    }

    async #updateChangelog ( changes ) {
        const tmp = new TmpFile( { "extname": ".md" } );

        var log = await ejs.renderFile( resolve( "#resources/templates/changelog.md.ejs", import.meta.url ), {
            changes,
            "newVersion": this.#newVersion,
        } );

        fs.writeFileSync( tmp.path, log );

        try {
            child_process.spawnSync( this.#userConfig.editor, [tmp.path], { "stdio": "inherit", "shell": true } );
        }
        catch ( e ) {
            return result( [500, "unable to create changelog"] );
        }

        log = fs.readFileSync( tmp.path, "utf8" );

        tmp.destroy();

        // lint
        const file = new LintFile( new File( { "path": "CHANGELOG.md", "content": log } ) );
        const res = await file.run( "lint" );
        if ( !res.ok ) return result( [500, `error linting "CHANGELOG.md"`] );

        log = res.data;

        console.log( `\n${ansi.hl( "# Changelog:" )}\n\n${log}` );

        // confirm release
        if ( ( await confirm( "Continue release process?", ["n", "y"] ) ) === "n" ) return result( [500, "terminated"] );

        // if ( this.#upstream ) log = this.#upstream.linkifyMessage( log );

        this.#changelog = log;

        log = "# Changelog\n\n" + log;

        // prepend log
        if ( fs.existsSync( this.#pkg.root + "/CHANGELOG.md" ) ) {
            const currentLog = fs
                .readFileSync( this.#pkg.root + "/CHANGELOG.md", "utf8" )
                .replace( /# Changelog/, "" )
                .trim();

            log += "\n" + currentLog + "\n";
        }

        // write
        fs.writeFileSync( this.#pkg.root + "/CHANGELOG.md", log );

        return result( 200 );
    }
}
