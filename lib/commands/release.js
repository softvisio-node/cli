module.exports = class {
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
            },
        };
    }

    // TODO wiki
    async run () {
        const Git = require( "../git" ),
            fs = require( "fs" ),
            child_process = require( "child_process" ),
            { confirm } = require( "@softvisio/core/util" ),
            { getProjectRoot } = require( "../util" );

        var root = getProjectRoot();

        if ( !root ) this._throw( "Unable to find project root." );

        const git = new Git( root );

        var id = await git.getId();

        if ( !id.ok ) this._throw( id );

        id = id.data;

        // check master branch
        if ( !id.branch || id.branch !== "master" ) this._throw( `Project is not on "master" branch.` );

        // check for uncommited changes
        if ( id.isDirty ) this._throw( `Working copy or sub-repositories has uncommited changes or untracked files.` );

        // check distance from the last release
        if ( id.release && !id.releaseDistance ) this._throw( `No changes  since the latesst release.` );

        var pkg = require( root + "/package.json" ),
            version = pkg.version,
            newVersion;

        if ( !version ) {
            if ( process.cli.options.bugfix ) this._throw( `Bugfix is impossible on initial release.` );

            version = "0.0.0";
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
        else {
            newVersion[2]++;
        }

        newVersion = newVersion.join( "." );

        if ( version === newVersion ) this._throw( `Nothing to do.` );

        var releases = await git.getReleases();

        if ( !releases.ok ) this._throw( `Unable to get releases. ${releases}` );

        if ( releases.data["v" + newVersion] ) this._throw( `Version "${newVersion}" is already released.` );

        console.log( `Current version: ${version}` );
        console.log( `Release version: ${newVersion}` );

        // confirm release
        if ( ( await confirm( "Continue release process?", ["y", "n"] ) ) === "n" ) this._throw( "Terminated." );

        // update CHANGES.md
        await this._updateChanges( version, newVersion, git, root );

        // update version in package.json
        pkg.version = newVersion;
        fs.writeFileSync( root + "/package.json", JSON.stringify( pkg, null, 4 ) + "\n" );

        // TODO generate wiki

        // add changes
        process.stdout.write( "Adding changes ..." );
        var res = await git.run( "add", "." );
        if ( !res.ok ) this._throw( res );
        console.log( res + "" );

        // commit
        process.stdout.write( "Commiting ..." );
        res = await git.run( "commit", "-m", `release v${newVersion}` );
        if ( !res.ok ) this._throw( res );
        console.log( res + "" );

        // set release tags
        process.stdout.write( "Setting tags ..." );
        res = await git.run( "tag", "-a", `v${newVersion}`, "-m", `Released version: v${newVersion}` );
        if ( !res.ok ) this._throw( res );

        res = await git.run( "tag", "latest", "--force" );
        if ( !res.ok ) this._throw( res );
        console.log( res + "" );

        // TODO prompt for repeat on error
        if ( await git.getUpstream() ) {

            // push
            while ( 1 ) {
                process.stdout.write( "Pushing ..." );

                res = await git.run( "push" );

                if ( !res.ok ) {
                    console.log( res );

                    if ( ( await confirm( "Repeat?", ["y", "n"] ) ) === "n" ) break;
                }
                else {
                    console.log( res + "" );

                    break;
                }
            }

            // push tags
            while ( 1 ) {
                process.stdout.write( "Pushing tags ..." );

                res = await git.run( "push", "origin", "-f", `refs/tags/v${newVersion}`, "refs/tags/latest" );

                if ( !res.ok ) {
                    console.log( res );

                    if ( ( await confirm( "Repeat?", ["y", "n"] ) ) === "n" ) break;
                }
                else {
                    console.log( res + "" );

                    break;
                }
            }
        }

        // publish npm
        if ( !pkg.private ) {
            while ( 1 ) {
                try {
                    child_process.spawnSync( "npm", ["publish", "--access", "public"], { "shell": true, "stdio": "inherit" } );
                }
                catch ( e ) {
                    console.log( `Unable to publish to the npm registry.` );

                    if ( ( await confirm( "Repeat?", ["y", "n"] ) ) === "n" ) break;
                }

                break;
            }
        }
    }

    _throw ( err ) {
        console.log( err + "" );

        process.exit( 2 );
    }

    async _updateChanges ( version, newVersion, git, root ) {

        // get changesets since the latest release
        var changes = await git.getLog( version === "0.0.0" ? null : "v" + version );

        var changelog = `LOG: Edit changelog. Lines started with "LOG:" will be removed.\n\n`;

        if ( changes.data ) {
            for ( const line of changes.data ) {
                changelog += `- ${line}\n`;
            }
        }

        const fs = require( "@softvisio/core/fs" ),
            tmp = fs.tmp.file( { "ext": ".txt" } ),
            child_process = require( "child_process" );

        fs.writeFileSync( tmp + "", changelog );

        try {
            child_process.spawnSync( "vim", [tmp], { "stdio": "inherit", "shell": true } );
        }
        catch ( e ) {
            this._throw( "Unable to compose changelog." );
        }

        changelog = fs.readFileSync( tmp + "", "utf8" );

        tmp.unlinkSync();

        var log = `## v${newVersion} (${new Date().toUTCString()})\n\n`;

        for ( let line of changelog.split( "\n" ) ) {
            line = line.trim();

            if ( !line ) continue;

            if ( line.match( /^LOG:/ ) ) continue;

            line = line.replace( /^[\s-]*/, "" );

            log += "-   " + line + "\n";
        }

        console.log( `\nCHANGELOG:\n${log}` );

        if ( fs.existsSync( root + "/CHANGELOG.md" ) ) log += "\n" + fs.readFileSync( root + "/CHANGELOG.md", "utf8" ).trim();

        fs.writeFileSync( root + "/CHANGELOG.md", log );

        return;
    }
};
