import Command from "#lib/command";

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

export default class extends Command {
    static cli () {
        return {
            "summary": "Release and publish the project.",
            "arguments": {
                "release": {
                    "summary": `Release type. Allowed values: "M" or "major", "m" or "minor", "p" or "patch", "n" or "next".`,
                    "minItems": 1,
                    "schema": { "type": "string", "enum": ["M", "major", "m", "minor", "p", "patch", "n", "next"] },
                },
                "pre-release-tag": {
                    "summary": `Pre-release tag. Allowed values: "a" or "alpha", "b" or "beta", "r" or "rc".`,
                    "schema": { "type": "string", "enum": ["a", "alpha", "b", "beta", "r", "rc"] },
                },
            },
        };
    }

    async run () {
        const { confirm } = await import( "#core/utils" ),
            userConfig = await this._getUserConfig(),
            { ansi } = await import( "#core/text" );

        // check user config
        if ( !userConfig.editor ) this._throwError( `Editor is not configured.` );

        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( "Unable to find project root." );

        const git = rootPackage.git;

        var id = await git.getId();

        if ( !id.ok ) this._throwError( id );

        id = id.data;

        // check branch
        if ( !id.branch ) this._throwError( `Project is on detached head.` );

        // check for uncommited changes
        if ( id.isDirty ) this._throwError( `Working copy or sub-repositories has uncommited changes or untracked files.` );

        // check distance from the last release
        if ( id.currentVersion && !id.currentVersionDistance && ( await confirm( "No changes since the latest release. Continue?", ["n", "y"] ) ) === "n" ) this._throwError( "Terminated." );

        var version = id.currentVersion,
            newVersion,
            newPrerelease;

        // prepeare release type
        process.cli.arguments.release = RELEASE[process.cli.arguments.release] || process.cli.arguments.release;
        process.cli.arguments["pre-release-tag"] = RELEASE_TAG[process.cli.arguments["pre-release-tag"]] || process.cli.arguments["pre-release-tag"];

        // if ( version.isNull === "0.0.0" && process.cli.arguments.release !== "minor" ) this._throwError( `Initial release can be "minor" only.` );

        // set newPrerelease value
        if ( process.cli.arguments.release === "next" || process.cli.arguments["pre-release-tag"] ) newPrerelease = true;

        // compose new verions
        if ( version.isPreRelease ) {

            // check next version
            if ( version.patch ) {
                if ( process.cli.arguments.release === "next" ) process.cli.arguments.release = "patch";
                else if ( process.cli.arguments.release !== "patch" ) this._throwError( `Release version must be "patch".` );
            }
            else if ( version.minor ) {
                if ( process.cli.arguments.release === "next" ) process.cli.arguments.release = "minor";
                else if ( process.cli.arguments.release !== "minor" ) this._throwError( `Release version must be "minor".` );
            }
            else if ( version.major ) {
                if ( process.cli.arguments.release === "next" ) process.cli.arguments.release = "major";
                else if ( process.cli.arguments.release !== "major" ) this._throwError( `Release version must be "major".` );
            }

            if ( newPrerelease ) {
                newVersion = version.inc( "prerelease", process.cli.arguments["pre-release-tag"] );

                if ( version.gte( newVersion ) ) this._throwError( `Pre-release tag "${process.cli.arguments["pre-release-tag"]}" should be greater than current tag "${version.prerelease[0]}".` );
            }
            else {

                // remove pre-release identifier
                newVersion = version.getBaseVersion();
            }
        }
        else {
            if ( process.cli.arguments.release === "next" ) {
                this._throwError( `You can use "next" command only when current version is pre-release.` );
            }
            else if ( process.cli.arguments["pre-release-tag"] ) {
                newVersion = version.inc( "pre" + process.cli.arguments.release, process.cli.arguments["pre-release-tag"] );
            }
            else {
                newVersion = version.inc( process.cli.arguments.release );
            }
        }

        // check, that new version isn't already exists
        if ( id.versions[newVersion] ) this._throwError( `Version "${newVersion}" is already released.` );

        // if new version is inherited from other base version, check that this base version is not already exists
        // eg: v1.0.0 ---> v1.2.0-rc.0 - check, that branch v1.2.0 is not released
        if ( version.getBaseVersion() + "" !== newVersion.getBaseVersion() + "" ) {
            const base = newVersion.getBaseVersion();

            for ( const tag in id.versions ) {
                const tagBase = id.versions[tag].getBaseVersion();

                // base version is already release on other branch
                if ( tagBase + "" === base + "" ) this._throwError( `Version "${tag}" is already released on other branch. You need to merge branches first.` );
            }
        }

        // define tags
        const latestMajorTag = `latest.${newVersion.major}`;
        const latestTag = version.isNull || ( id.lastVersion + "" === version + "" && !newVersion.isPreRelease ) ? "latest" : "";

        // get linked workspaces
        const packages = rootPackage.packages;

        // check for pre-release dependencies
        // non pre-release version can't have pre-release deps in package.json
        if ( !newPrerelease ) {
            for ( const pkg of [rootPackage, ...packages] ) {
                const res = pkg.hasPreReleaseDepth();

                if ( !res.ok ) this._throwError( res.reason );
            }
        }

        console.log( `\nCurrent version: ${ansi.ok( " " + version + " " )}` );
        console.log( `Release version: ${ansi.error( " " + newVersion + " " )} [${[latestMajorTag, latestTag].filter( tag => tag ).join( ", " )}]` );

        if ( packages.length ) {
            console.log( `\nPackages found:` );

            packages.forEach( pkg => console.log( "  - " + pkg.relativePath ) );
        }

        // confirm release
        if ( ( await confirm( "\nContinue release process?", ["n", "y"] ) ) === "n" ) this._throwError( "Terminated." );

        var res;

        // run tests
        // console.log( "\nRun tests:" );

        // res = await rootPackage.test( { "log": false, "bail": true } );
        // if ( !res.ok ) this._throwError( "Tests failed" );

        // for ( const pkg of packages ) {
        //     res = await pkg.test( { "log": false, "bail": true } );
        //     if ( !res.ok ) this._throwError( "Tests failed" );
        // }

        // updating wiki
        const wiki = rootPackage.wiki;
        if ( wiki.isExists ) {
            console.log( "" );
            const res = await wiki.update();
            if ( !res.ok ) this._exitOnError()();
        }

        // update CHANGES.md
        await this.#updateChanges( version, newVersion, git, rootPackage.root, userConfig.editor );

        // update version
        rootPackage.patchVersion( newVersion );

        // update linked workspaces version
        packages.forEach( pkg => pkg.patchVersion( newVersion ) );

        // add changes
        process.stdout.write( "Adding changes ... " );
        res = await git.run( "add", "." );
        if ( !res.ok ) this._throwError( res );
        console.log( res + "" );

        // commit
        process.stdout.write( "Commiting ... " );
        res = await git.run( "commit", "-m", `release ${newVersion.toVersionString()}` );
        if ( !res.ok ) this._throwError( res );
        console.log( res + "" );

        // set version tag
        process.stdout.write( "Setting tags ... " );
        res = await git.run( "tag", "-a", `${newVersion.toVersionString()}`, "-m", `Released version: ${newVersion.toVersionString()}` );
        if ( !res.ok ) this._throwError( res );

        // set latest.major tag
        res = await git.run( "tag", latestMajorTag, "--force" );
        if ( !res.ok ) this._throwError( res );

        // set "latest" tag
        if ( latestTag ) {
            res = await git.run( "tag", latestTag, "--force" );
            if ( !res.ok ) this._throwError( res );
        }

        console.log( res + "" );

        // push, if has upstream
        if ( await git.getUpstream() ) {
            while ( 1 ) {
                process.stdout.write( "Pushing ... " );

                res = await git.run( "push", "--atomic", "origin", id.branch, newVersion.toVersionString(), latestMajorTag, "latest", "--force" );

                if ( !res.ok ) {
                    console.log( res + "" );

                    if ( ( await confirm( "Repeat?", ["y", "n"] ) ) === "n" ) break;
                }
                else {
                    console.log( res + "" );

                    break;
                }
            }
        }

        // publish root package
        await rootPackage.publish( latestMajorTag, latestTag );

        // publish linked workspaces
        for ( const pkg of packages ) {
            if ( !pkg.isPrivate ) await pkg.publish( latestMajorTag, latestTag );
        }
    }

    async #updateChanges ( version, newVersion, git, root, editor ) {
        const { "default": fs } = await import( "#core/fs" ),
            tmp = fs.tmp.file( { "ext": ".md" } ),
            child_process = await import( "child_process" ),
            { ansi } = await import( "#core/text" );

        // get changesets since the latest release
        var changes = await git.getLog( version );

        var log = `## ${newVersion} (${new Date().toISOString().substr( 0, 10 )})\n\n`;

        if ( changes.data ) {
            log += `### Raw commits log\n\n`;

            for ( const line of changes.data ) {
                log += `-   ${line};\n`;
            }
        }

        fs.writeFileSync( tmp + "", log );

        try {
            child_process.spawnSync( editor, [tmp], { "stdio": "inherit", "shell": true } );
        }
        catch ( e ) {
            this._throwError( "Unable to compose changelog." );
        }

        log = fs.readFileSync( tmp + "", "utf8" );

        tmp.remove();

        // lint
        const { "default": File } = await import( "#lib/src/file" );
        const file = new File( "./CHANGELOG.md", { "data": log } );
        const res = await file.run( "lint" );
        if ( !res.ok ) this._throwError( `Error linting CHANGELOG.md.` );

        log = res.data;

        process.stdout.write( `\n${ansi.hl( "Changelog:" )}\n\n${log}` );

        // confirm release
        const { confirm } = await import( "#core/utils" );
        if ( ( await confirm( "\nContinue release process?", ["n", "y"] ) ) === "n" ) this._throwError( "Terminated." );

        // prepend log
        if ( fs.existsSync( root + "/CHANGELOG.md" ) ) log += "\n" + fs.readFileSync( root + "/CHANGELOG.md", "utf8" ).trim() + "\n";

        // write
        fs.writeFileSync( root + "/CHANGELOG.md", log );

        return;
    }
}
