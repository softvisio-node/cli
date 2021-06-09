import confirm from "#core/utils";
import env from "#core/env";
import ansi from "#core/text/ansi";
import fs from "#core/fs";
import child_process from "child_process";
import File from "#lib/src/file";

const RELEASE = {
    "M": "major",
    "m": "minor",
    "p": "patch",
    "n": "next",
};

const RELEASE_TAG = {
    "a": "alpha",
    "b": "beta",
    "r": "rc",
};

export default class Publish {
    #pkg;
    #releaseType;
    #preReleaseTag;

    constructor ( pkg, releaseType, preReleaseTag ) {
        this.#pkg = pkg;
        this.#releaseType = releaseType;
        this.#preReleaseTag = preReleaseTag;
    }

    // public
    async run () {
        const userConfig = await env.getUserConfig();

        // check user config
        if ( !userConfig.editor ) return result( [500, `Editor is not configured.`] );

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

        var version = id.currentVersion,
            newVersion,
            newPrerelease;

        // prepeare release type
        this.#releaseType = RELEASE[this.#releaseType] || this.#releaseType;
        this.#preReleaseTag = RELEASE_TAG[this.#preReleaseTag] || this.#preReleaseTag;

        // if ( version.isNull === "0.0.0" && this.#releaseType !== "minor" ) return result( [500, `Initial release can be "minor" only.`] );

        // set newPrerelease value
        if ( this.#releaseType === "next" || this.#preReleaseTag ) newPrerelease = true;

        // compose new verions
        if ( version.isPreRelease ) {

            // check next version
            if ( version.patch ) {
                if ( this.#releaseType === "next" ) this.#releaseType = "patch";
                else if ( this.#releaseType !== "patch" ) return result( [500, `Release version must be "patch".`] );
            }
            else if ( version.minor ) {
                if ( this.#releaseType === "next" ) this.#releaseType = "minor";
                else if ( this.#releaseType !== "minor" ) return result( [500, `Release version must be "minor".`] );
            }
            else if ( version.major ) {
                if ( this.#releaseType === "next" ) this.#releaseType = "major";
                else if ( this.#releaseType !== "major" ) return result( [500, `Release version must be "major".`] );
            }

            if ( newPrerelease ) {
                newVersion = version.inc( "prerelease", this.#preReleaseTag );

                if ( version.gte( newVersion ) ) return result( [500, `Pre-release tag "${this.#preReleaseTag}" should be greater than current tag "${version.prerelease[0]}".`] );
            }
            else {

                // remove pre-release identifier
                newVersion = version.getBaseVersion();
            }
        }
        else {
            if ( this.#releaseType === "next" ) {
                return result( [500, `You can use "next" command only when current version is pre-release.`] );
            }
            else if ( this.#preReleaseTag ) {
                newVersion = version.inc( "pre" + this.#releaseType, this.#preReleaseTag );
            }
            else {
                newVersion = version.inc( this.#releaseType );
            }
        }

        // check, that new version isn't already exists
        if ( id.versions[newVersion] ) return result( [500, `Version "${newVersion}" is already released.`] );

        // if new version is inherited from other base version, check that this base version is not already exists
        // eg: v1.0.0 ---> v1.2.0-rc.0 - check, that branch v1.2.0 is not released
        if ( version.getBaseVersion() + "" !== newVersion.getBaseVersion() + "" ) {
            const base = newVersion.getBaseVersion();

            for ( const tag in id.versions ) {
                const tagBase = id.versions[tag].getBaseVersion();

                // base version is already release on other branch
                if ( tagBase + "" === base + "" ) return result( [500, `Version "${tag}" is already released on other branch. You need to merge branches first.`] );
            }
        }

        // define tags
        const latestMajorTag = `latest.${newVersion.major}`;
        const latestTag = version.isNull || ( id.lastVersion + "" === version + "" && !newVersion.isPreRelease ) ? "latest" : "";

        // get linked workspaces
        const packages = this.#pkg.packages;

        // check for pre-release dependencies
        // non pre-release version can't have pre-release deps in package.json
        if ( !newPrerelease ) {
            for ( const pkg of [this.#pkg, ...packages] ) {
                const res = pkg.hasPreReleaseDepth();

                if ( !res.ok ) return res;
            }
        }

        console.log( `\nCurrent version: ${ansi.ok( " " + version + " " )}` );
        console.log( `Release version: ${ansi.error( " " + newVersion + " " )} [${[latestMajorTag, latestTag].filter( tag => tag ).join( ", " )}]` );

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

        // update CHANGES.md
        await this.#updateChanges( version, newVersion, git, this.#pkg.root, userConfig.editor );

        // update version
        this.#pkg.patchVersion( newVersion );

        // update linked workspaces version
        packages.forEach( pkg => pkg.patchVersion( newVersion ) );

        // add changes
        process.stdout.write( "Adding changes ... " );
        res = await git.run( "add", "." );
        if ( !res.ok ) return res;
        console.log( res + "" );

        // commit
        process.stdout.write( "Commiting ... " );
        res = await git.run( "commit", "-m", `release ${newVersion.toVersionString()}` );
        if ( !res.ok ) return res;
        console.log( res + "" );

        // set version tag
        process.stdout.write( "Setting tags ... " );
        res = await git.run( "tag", "-a", `${newVersion.toVersionString()}`, "-m", `Released version: ${newVersion.toVersionString()}` );
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

        const upstream = await git.getUpstream();

        // push, if has upstream
        if ( upstream ) {
            while ( 1 ) {
                process.stdout.write( "Pushing ... " );

                res = await git.run( "push", "--atomic", "origin", id.branch, newVersion.toVersionString(), latestMajorTag, "latest", "--force" );

                console.log( res + "" );

                if ( !res.ok ) {
                    if ( ( await confirm( "Repeat?", ["y", "n"] ) ) === "n" ) break;
                }
                else {
                    break;
                }
            }

            if ( upstream.hosting === "github" ) {
                while ( 1 ) {
                    process.stdout.write( "Creating release on GitHub ... " );

                    res = await this.#createGitHubRelease( upstream, newVersion );

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
    }

    // private
    async #updateChanges ( version, newVersion, git, root, editor ) {
        const tmp = fs.tmp.file( { "ext": ".md" } );

        // get changesets since the latest release
        var changes = await git.getLog( version );

        var log = `### ${newVersion} (${new Date().toISOString().substr( 0, 10 )})\n\n`;

        if ( changes.data ) {
            log += `Changed:\n\n`;

            for ( const line of changes.data ) {
                log += `-   ${line};\n`;
            }

            log += `\nAdded:\n\nRemoved:\n\nFixed:\n`;
        }

        fs.writeFileSync( tmp + "", log );

        try {
            child_process.spawnSync( editor, [tmp], { "stdio": "inherit", "shell": true } );
        }
        catch ( e ) {
            return result( [500, "Unable to compose changelog."] );
        }

        log = fs.readFileSync( tmp + "", "utf8" );

        tmp.remove();

        // lint
        const file = new File( "./CHANGELOG.md", { "data": log } );
        const res = await file.run( "lint" );
        if ( !res.ok ) return result( [500, `Error linting CHANGELOG.md.`] );

        log = res.data;

        process.stdout.write( `\n${ansi.hl( "# Changelog:" )}\n\n${log}` );

        // confirm release
        if ( ( await confirm( "\nContinue release process?", ["n", "y"] ) ) === "n" ) return result( [500, "Terminated."] );

        log = "# Changelog\n\n" + log;

        // prepend log
        if ( fs.existsSync( root + "/CHANGELOG.md" ) ) {
            const currentLog = fs
                .readFileSync( root + "/CHANGELOG.md", "utf8" )
                .replace( /# Changelog/, "" )
                .trim();

            log += "\n" + currentLog + "\n";
        }

        // write
        fs.writeFileSync( root + "/CHANGELOG.md", log );

        return;
    }

    async #createGitHubRelease ( upstream ) {}
}
