const Command = require( "../command" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Release project.",
            "options": {
                "major": {
                    "short": "M",
                    "summary": "Increment major version.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "minor": {
                    "summary": "Increment minor version.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "bugfix": {
                    "summary": "Increment bugfix version.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "force": {
                    "summary": `Answer "YES" on all questions.`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    async run () {
        const CONST = require( "../const" ),
            { confirm } = require( "@softvisio/core/util" ),
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

        var version = ( id.currentRelease || "0.0.0" ).replace( CONST.VERSION_PREFIX, "" ),
            newVersion;

        if ( version === "0.0.0" ) {
            if ( process.cli.options.bugfix ) this._throwError( `Bugfix is impossible on initial release.` );

            newVersion = [0, 0, 0];
        }
        else {
            newVersion = version.split( "." );
        }

        if ( process.cli.options.major ) {
            newVersion[0]++;
            newVersion[1] = 0;
            newVersion[2] = 0;
        }
        else if ( process.cli.options.minor ) {
            newVersion[1]++;
            newVersion[2] = 0;
        }
        else if ( process.cli.options.bugfix ) {
            newVersion[2]++;
        }

        newVersion = newVersion.join( "." );

        if ( version === newVersion ) this._throwError( `Nothing to do.` );

        // check, that new version wasn't already released
        if ( id.releases[CONST.VERSION_PREFIX + newVersion] ) this._throwError( `Version "${newVersion}" is already released.` );

        const latest = version === "0.0.0" || id.latestRelease === CONST.VERSION_PREFIX + version ? true : false;

        // find sub-projects
        const workspaces = rootPackage.workspaces;

        console.log( `Current version: ${version}` );
        console.log( `Release version: ${newVersion}${latest ? " [latest]" : ""}` );

        if ( workspaces.length ) {
            console.log( `Workspaces found:` );

            workspaces.forEach( workspace => console.log( "  - " + workspaces.relativePath ) );
        }

        // confirm release
        if ( !process.cli.options.force && ( await confirm( "\nContinue release process?", ["n", "y"] ) ) === "n" ) this._throwError( "Terminated." );

        // updating wiki
        const Wiki = require( "../wiki" ),
            wiki = new Wiki( rootPackage.root );

        console.log( "" );
        await wiki.update();

        // update CHANGES.md
        await this._updateChanges( version, newVersion, git, rootPackage.root, userConfig.editor );

        // update version
        rootPackage.patchVersion( newVersion );

        // update workspaces version
        workspaces.forEach( workspace => workspace.patchVersion( newVersion ) );

        // add changes
        process.stdout.write( "Adding changes ... " );
        var res = await git.run( "add", "." );
        if ( !res.ok ) this._throwError( res );
        console.log( res + "" );

        // commit
        process.stdout.write( "Commiting ... " );
        res = await git.run( "commit", "-m", `release ${CONST.VERSION_PREFIX + newVersion}` );
        if ( !res.ok ) this._throwError( res );
        console.log( res + "" );

        // set version tag
        process.stdout.write( "Setting tags ... " );
        res = await git.run( "tag", "-a", `v${newVersion}`, "-m", `Released version: ${CONST.VERSION_PREFIX + newVersion}` );
        if ( !res.ok ) this._throwError( res );

        // set "latest" tag
        if ( latest ) {
            res = await git.run( "tag", "latest", "--force" );
            if ( !res.ok ) this._throwError( res );
        }

        console.log( res + "" );

        // push
        if ( await git.getUpstream() ) {
            while ( 1 ) {
                process.stdout.write( "Pushing ... " );

                res = await git.run( "push", "--atomic", "origin", id.branch, CONST.VERSION_PREFIX + newVersion, "latest", "--force" );

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

        // publish npm
        await rootPackage.publish();
    }

    async _updateChanges ( version, newVersion, git, root, editor ) {
        const fs = require( "@softvisio/core/fs" ),
            tmp = fs.tmp.file( { "ext": ".txt" } ),
            child_process = require( "child_process" ),
            CONST = require( "../const" );

        // get changesets since the latest release
        var changes = await git.getLog( version === "0.0.0" ? null : CONST.VERSION_PREFIX + version );

        var changelog = `LOG: Edit changelog. Lines started with "LOG:" will be removed.\n\n`;

        if ( changes.data ) {
            for ( const line of changes.data ) {
                changelog += `- ${line}\n`;
            }
        }

        fs.writeFileSync( tmp + "", changelog );

        try {
            child_process.spawnSync( editor, [tmp], { "stdio": "inherit", "shell": true } );
        }
        catch ( e ) {
            this._throwError( "Unable to compose changelog." );
        }

        changelog = fs.readFileSync( tmp + "", "utf8" );

        tmp.unlinkSync();

        var log = `## ${newVersion} (${new Date().toISOString().substr( 0, 10 )})\n\n`;

        for ( let line of changelog.split( "\n" ) ) {
            line = line.trim();

            if ( !line ) continue;

            if ( line.match( /^LOG:/ ) ) continue;

            line = line.replace( /^[\s-]*/, "" );

            log += "-   " + line + "\n";
        }

        console.log( `\nCHANGELOG:\n${log}` );

        if ( fs.existsSync( root + "/CHANGELOG.md" ) ) log += "\n" + fs.readFileSync( root + "/CHANGELOG.md", "utf8" ).trim() + "\n";

        fs.writeFileSync( root + "/CHANGELOG.md", log );

        return;
    }
};
