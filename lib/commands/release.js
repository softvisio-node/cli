const Command = require( "../command" );

const RELEASE = {
    "M": "major",
    "m": "minor",
    "p": "patch",
};

const RELEASE_TAG = {
    "a": "alpha",
    "b": "beta",
    "r": "rc",
};

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Release project.",
            "options": {
                "force": {
                    "summary": `Answer "YES" on all questions.`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "release": {
                    "summary": `Release type. Allowed values: "M" or "major", "m" or "minor", "p" or "patch".`,
                    "minItems": 1,
                    "schema": { "type": "string", "enum": ["M", "major", "m", "minor", "p", "patch"] },
                },
                "pre-release-tag": {
                    "summary": `Pre-release tag. Allowed values: "a" or "alpha", "b" or "beta", "r" or "rc".`,
                    "schema": { "type": "string", "enum": ["a", "alpha", "b", "beta", "r", "rc"] },
                },
            },
        };
    }

    async run () {
        const { confirm } = require( "@softvisio/core/util" ),
            semver = require( "semver" ),
            userConfig = this._getUserConfig();

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
        if ( id.currentRelease && !id.currentReleaseDistance && !process.cli.options.force && ( await confirm( "No changes since the latest release. Continue?", ["n", "y"] ) ) === "n" ) this._throwError( "Terminated." );

        var version = ( id.currentRelease || "0.0.0" ).replace( /^v/, "" ),
            newVersion;

        if ( version === "0.0.0" && process.cli.arguments.release !== "minor" ) this._throwError( `Initial release can be "minor" only.` );

        // prepeare release type
        process.cli.arguments.release = RELEASE[process.cli.arguments.release] || process.cli.arguments.release;
        process.cli.arguments["pre-release-tag"] = RELEASE_TAG[process.cli.arguments["pre-release-tag"]] || process.cli.arguments["pre-release-tag"];

        // compose new verions
        if ( semver.prerelease( version ) ) {

            // check next version
            if ( semver.patch( version ) && process.cli.arguments.release !== "patch" ) this._throwError( `Release version must be "patch".` );
            else if ( semver.minor( version ) && process.cli.arguments.release !== "minor" ) this._throwError( `Release version must be "minor".` );
            else if ( semver.major( version ) && process.cli.arguments.release !== "major" ) this._throwError( `Release version must be "major".` );

            if ( process.cli.arguments["pre-release-tag"] ) {
                newVersion = semver.inc( version, "prerelease", process.cli.arguments["pre-release-tag"] );

                if ( semver.gte( version, newVersion ) ) this._throwError( `Pre-release tag "${process.cli.arguments["pre-release-tag"]}" should be greater than current tag "${semver.prerelease( version )[0]}".` );
            }
            else {

                // remove pre-release identifier
                newVersion = version.replace( /-.+$/, "" );
            }
        }
        else {
            if ( process.cli.arguments["pre-release-tag"] ) {
                newVersion = semver.inc( version, "pre" + process.cli.arguments.release, process.cli.arguments["pre-release-tag"] );
            }
            else {
                newVersion = semver.inc( version, process.cli.arguments.release );
            }
        }

        // check, that new version wasn't already released
        if ( id.releases["v" + newVersion] ) this._throwError( `Version "${newVersion}" is already released.` );

        // define tags
        const latestMajor = `latest.${semver.major( newVersion )}`;
        const latest = version === "0.0.0" || ( id.latestRelease === "v" + version && !semver.prerelease( newVersion ) ) ? true : false;

        console.log( `\nCurrent version: ${version}` );
        console.log( `Release version: ${newVersion} [${latestMajor}${latest ? ", latest" : ""}]` );

        // get linked workspaces
        const linkedWorkspaces = rootPackage.linkedWorkspaces;

        if ( linkedWorkspaces.length ) {
            console.log( `\nLinked workspaces found:` );

            linkedWorkspaces.forEach( linkedWorkspaces => console.log( "  - " + linkedWorkspaces.relativePath ) );
        }

        // confirm release
        if ( !process.cli.options.force && ( await confirm( "\nContinue release process?", ["n", "y"] ) ) === "n" ) this._throwError( "Terminated." );

        // updating wiki
        const wiki = rootPackage.wiki;
        if ( wiki.isExists ) {
            console.log( "" );
            const res = await wiki.update();
            if ( !res.ok ) this._exitOnError()();
        }

        // update CHANGES.md
        await this._updateChanges( version, newVersion, git, rootPackage.root, userConfig.editor );

        // update version
        rootPackage.patchVersion( newVersion );

        // update linked workspaces version
        linkedWorkspaces.forEach( workspace => workspace.patchVersion( newVersion ) );

        // add changes
        process.stdout.write( "Adding changes ... " );
        var res = await git.run( "add", "." );
        if ( !res.ok ) this._throwError( res );
        console.log( res + "" );

        // commit
        process.stdout.write( "Commiting ... " );
        res = await git.run( "commit", "-m", `release v${newVersion}` );
        if ( !res.ok ) this._throwError( res );
        console.log( res + "" );

        // set version tag
        process.stdout.write( "Setting tags ... " );
        res = await git.run( "tag", "-a", `v${newVersion}`, "-m", `Released version: v${newVersion}` );
        if ( !res.ok ) this._throwError( res );

        // set latest.majot tag
        res = await git.run( "tag", latestMajor, "--force" );
        if ( !res.ok ) this._throwError( res );

        // set "latest" tag
        if ( latest ) {
            res = await git.run( "tag", "latest", "--force" );
            if ( !res.ok ) this._throwError( res );
        }

        console.log( res + "" );

        // push, if has upstream
        if ( await git.getUpstream() ) {
            while ( 1 ) {
                process.stdout.write( "Pushing ... " );

                res = await git.run( "push", "--atomic", "origin", id.branch, "v" + newVersion, latestMajor, "latest", "--force" );

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
        await rootPackage.publish( latestMajor, latest );

        // publish linked workspaces
        for ( const workspace of linkedWorkspaces ) {
            if ( !workspace.isPrivate ) await workspace.publish( latestMajor, latest );
        }
    }

    async _updateChanges ( version, newVersion, git, root, editor ) {
        const fs = require( "@softvisio/core/fs" ),
            tmp = fs.tmp.file( { "ext": ".md" } ),
            child_process = require( "child_process" );

        // get changesets since the latest release
        var changes = await git.getLog( version === "0.0.0" ? null : "v" + version );

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

        tmp.unlinkSync();

        // lint
        const File = require( "../src/file" );
        const file = new File( "./CHANGELOG.md", { "data": log } );
        const res = await file.run( "lint" );
        if ( !res.ok ) this._throwError( `Error linting CHANGELOG.md.` );

        log = res.data;

        process.stdout.write( `\nCHANGELOG:\n${log}` );

        // confirm release
        const { confirm } = require( "@softvisio/core/util" );
        if ( !process.cli.options.force && ( await confirm( "\nContinue release process?", ["n", "y"] ) ) === "n" ) this._throwError( "Terminated." );

        // prepend log
        if ( fs.existsSync( root + "/CHANGELOG.md" ) ) log += "\n" + fs.readFileSync( root + "/CHANGELOG.md", "utf8" ).trim() + "\n";

        // write
        fs.writeFileSync( root + "/CHANGELOG.md", log );

        return;
    }
};
