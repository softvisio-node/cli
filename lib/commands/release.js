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
            child_process = require( "child_process" ),
            { confirm } = require( "@softvisio/core/util" ),
            path = require( "path" ),
            userConfig = this._getUserConfig();

        // check user config
        if ( !userConfig.editor ) this._throwError( `Editor is not configured.` );

        var root = this._getProjectRoot();

        if ( !root ) this._throwError( "Unable to find project root." );

        const git = this._getGit( root );

        var id = await git.getId();

        if ( !id.ok ) this._throwError( id );

        id = id.data;

        // check master branch
        // if ( !id.branch || id.branch !== "master" ) this._throwError( `Project is not on "master" branch.` );

        // check for uncommited changes
        if ( id.isDirty ) this._throwError( `Working copy or sub-repositories has uncommited changes or untracked files.` );

        // check distance from the last release
        if ( id.release && !id.releaseDistance ) this._throwError( `No changes  since the latesst release.` );

        var version = ( id.release || "0.0.0" ).replace( CONST.VERSION_PREFIX, "" ),
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

        var releases = await git.getReleases();

        if ( !releases.ok ) this._throwError( `Unable to get releases. ${releases}` );

        if ( releases.data[CONST.VERSION_PREFIX + newVersion] ) this._throwError( `Version "${newVersion}" is already released.` );

        const latest = Object.keys( releases.data )[0] === CONST.VERSION_PREFIX + version ? true : false;

        // find sub-projects
        const subProjects = this._getSubProjects( root );

        console.log( `Current version: ${version}` );
        console.log( `Release version: ${newVersion}${latest ? " (latest)" : ""}` );

        if ( subProjects.length ) {
            console.log( `Sub-projects found:` );

            for ( const subProject of subProjects ) {
                console.log( "  - " + path.basename( subProject ) );
            }
        }

        // confirm release
        if ( !process.cli.options.force && ( await confirm( "\nContinue release process?", ["n", "y"] ) ) === "n" ) this._throwError( "Terminated." );

        // updating wiki
        const Wiki = require( "../wiki" ),
            wiki = new Wiki( root );

        await wiki.update();

        // update CHANGES.md
        await this._updateChanges( version, newVersion, git, root, userConfig.editor );

        // update version
        this._updateVersion( root, newVersion );

        // update sub-projects version
        if ( subProjects.length ) {
            for ( const subProject of subProjects ) {
                this._updateVersion( subProject, newVersion );
            }
        }

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

        // set release tags
        process.stdout.write( "Setting tags ... " );
        res = await git.run( "tag", "-a", `v${newVersion}`, "-m", `Released version: ${CONST.VERSION_PREFIX + newVersion}` );
        if ( !res.ok ) this._throwError( res );

        if ( latest ) {
            res = await git.run( "tag", "latest", "--force" );
            if ( !res.ok ) this._throwError( res );
        }

        console.log( res + "" );

        // push
        if ( await git.getUpstream() ) {
            while ( 1 ) {
                process.stdout.write( "Pushing ... " );

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
                process.stdout.write( "Pushing tags ... " );

                res = await git.run( "push", "origin", "-f", `refs/tags/${CONST.VERSION_PREFIX + newVersion}`, latest ? "refs/tags/latest" : null );

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
        const pkg = require( root + "/package.json" );
        if ( !pkg.private ) {
            while ( 1 ) {
                try {
                    child_process.spawnSync( "npm", ["publish", "--access", "public", root], { "shell": true, "stdio": "inherit" } );
                }
                catch ( e ) {
                    console.log( `Unable to publish to the npm registry.` );

                    if ( ( await confirm( "Repeat?", ["y", "n"] ) ) === "n" ) break;
                }

                break;
            }
        }
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

    _updateVersion ( root, version ) {
        const fs = require( "fs" );

        // update package.json
        const pkg = require( root + "/package.json" );
        pkg.version = version;
        fs.writeFileSync( root + "/package.json", JSON.stringify( pkg, null, 4 ) + "\n" );

        if ( fs.existsSync( root + "/config.xml" ) ) {
            var xml = fs.readFileSync( root + "/config.xml", "utf8" ),
                replaced;

            xml = xml.replace( /(<widget[^>]+version=")\d+\.\d+\.\d+(")/, ( ...match ) => {
                replaced = true;

                return match[1] + version + match[2];
            } );

            if ( replaced ) fs.writeFileSync( root + "/config.xml", xml );
        }
    }
};
