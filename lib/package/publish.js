import { confirm, resolve } from "#core/utils";
import env from "#core/env";
import ansi from "#core/text/ansi";
import fs from "fs";
import child_process from "child_process";
import LintFile from "#lib/lint/file";
import GitHub from "#core/api/github";
import File from "#core/file";
import { TmpFile } from "#core/tmp";
import Changes from "#lib/changes";
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
        if ( !this.#userConfig.editor ) return result( [500, `Editor is not configured.`] );

        const git = this.#pkg.git;

        var id = await git.getId();

        if ( !id.ok ) return id;

        id = id.data;

        // check branch
        if ( !id.branch ) return result( [500, `Project is on detached head.`] );

        // check for uncommited changes
        if ( id.isDirty ) return result( [500, `Working copy or sub-repositories has uncommited changes or untracked files.`] );

        // check distance from the last release
        if ( id.currentVersion && !id.currentVersionDistance && ( await confirm( "No changes since the latest release. Continue?", ["n", "y"] ) ) === "n" ) return result( [500, "Terminated."] );

        this.#version = id.currentVersion;

        // get changes
        var changes = await this.#getChanges();
        if ( !changes.ok ) return changes;
        changes = changes.data;

        changes.report();

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
        if ( this.#dropPreRelease ) this.#newVersion = this.#newVersion.getBaseVersion();

        if ( this.#version.gte( this.#newVersion ) ) {
            return result( [500, `Pre-release tag should be greater than current tag.`] );
        }

        // check, that new version isn't already exists
        if ( id.versions[this.#newVersion] ) return result( [500, `Version "${this.#newVersion}" is already released.`] );

        // if new version is inherited from other base version, check that this base version is not already exists
        // eg: v1.0.0 ---> v1.2.0-rc.0 - check, that branch v1.2.0 is not released
        if ( this.#version.getBaseVersion() + "" !== this.#newVersion.getBaseVersion() + "" ) {
            const base = this.#newVersion.getBaseVersion();

            for ( const tag in id.versions ) {
                const tagBase = id.versions[tag].getBaseVersion();

                // base version is already release on other branch
                if ( tagBase + "" === base + "" ) return result( [500, `Version "${tag}" is already released on other branch. You need to merge branches first.`] );
            }
        }

        // define tags
        const latestMajorTag = `latest.${this.#newVersion.major}`;
        const latestTag = this.#version.isNull || ( id.lastVersion + "" === this.#version + "" && !this.#newVersion.isPreRelease ) ? "latest" : "";

        // get linked workspaces
        const packages = this.#pkg.packages;

        // check for pre-release dependencies
        // non pre-release version can't have pre-release deps in package.json
        if ( !this.#newVersion.isPreRelease ) {
            for ( const pkg of [this.#pkg, ...packages] ) {
                const res = pkg.hasPreReleaseDepth();

                if ( !res.ok ) return res;
            }
        }

        console.log( `\nCurrent version: ${ansi.ok( " " + this.#version + " " )}` );
        console.log( `Release version: ${ansi.error( " " + this.#newVersion + " " )} [${[latestMajorTag, latestTag].filter( tag => tag ).join( ", " )}]` );

        if ( packages.length ) {
            console.log( `\nPackages found:` );

            packages.forEach( pkg => console.log( "  - " + pkg.relativePath ) );
        }

        // confirm release
        if ( ( await confirm( "\nContinue release process?", ["n", "y"] ) ) === "n" ) return result( [500, "Terminated."] );

        var res;

        // run tests
        // console.log( "\nRun tests:" );

        // res = await this.#pkg.test( { "log": false, "bail": true } );
        // if ( !res.ok ) return result( [500, "Tests failed"] );

        // for ( const pkg of packages ) {
        //     res = await pkg.test( { "log": false, "bail": true } );
        //     if ( !res.ok ) return result( [500, "Tests failed"] );
        // }

        // updating documentation
        const docs = this.#pkg.docs;
        if ( docs.isExists ) {
            console.log( "" );
            const res = await docs.build();
            if ( !res.ok ) return res;
        }

        // update changelog
        res = await this.#updateChanges( changes );
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

        // set latest.major tag
        res = await git.run( "tag", latestMajorTag, "--force" );
        if ( !res.ok ) return res;

        // set "latest" tag
        if ( latestTag ) {
            res = await git.run( "tag", latestTag, "--force" );
            if ( !res.ok ) return res;
        }

        console.log( res + "" );

        this.#upstream = await git.getUpstream();

        // push, if has upstream
        if ( this.#upstream ) {
            while ( 1 ) {
                process.stdout.write( "Pushing ... " );

                res = await git.run( "push", "--atomic", "origin", id.branch, this.#newVersion.toVersionString(), latestMajorTag, "latest", "--force" );

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
        await this.#pkg.publishNPM( latestMajorTag, latestTag );

        // publish linked workspaces
        for ( const pkg of packages ) {
            if ( !pkg.isPrivate ) await pkg.publishNPM( latestMajorTag, latestTag );
        }

        return result( 200 );
    }

    // private
    async #updateChanges ( changes ) {
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
            return result( [500, "Unable to compose changelog."] );
        }

        log = fs.readFileSync( tmp.path, "utf8" );

        tmp.destroy();

        // lint
        const file = new LintFile( new File( { "path": "CHANGELOG.md", "content": log } ) );
        const res = await file.run( "lint" );
        if ( !res.ok ) return result( [500, `Error linting CHANGELOG.md.`] );

        log = res.data;

        process.stdout.write( `\n${ansi.hl( "# Changelog:" )}\n\n${log}` );

        // confirm release
        if ( ( await confirm( "\nContinue release process?", ["n", "y"] ) ) === "n" ) return result( [500, "Terminated."] );

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

    async #getChanges () {

        // get changesets since the latest release
        const commits = await this.#pkg.git.getLog( this.#version );

        if ( !commits.ok ) return commits;

        return result( 200, new Changes( commits.data ) );
    }
}
