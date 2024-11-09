import childProcess from "node:child_process";
import fs from "node:fs";
import _path from "node:path";
import Ajv from "#core/ajv";
import { readConfig, writeConfig } from "#core/config";
import env from "#core/env";
import File from "#core/file";
import FileTree from "#core/file-tree";
import { chmodSync } from "#core/fs";
import glob from "#core/glob";
import GlobPatterns from "#core/glob/patterns";
import Semver from "#core/semver";
import { ansi, Table } from "#core/text";
import { confirm, mergeObjects, objectIsEmpty } from "#core/utils";
import yaml from "#core/yaml";
import Git from "#lib/git";
import Docs from "#lib/package/docs";
import Localization from "#lib/package/localization";
import Wiki from "#lib/package/wiki";
import { findWorkspacePackages } from "#lib/utils";

const validateCliConfig = new Ajv().compileFile( import.meta.resolve( "#resources/schemas/cli.config.schema.yaml" ) ),
    defaultCliConfig = readConfig( "#resources/cli.config.yaml", { "resolve": import.meta.url } );

export default class Package {
    #root;
    #rootPackage;
    #parentPackage;
    #isPackage;
    #isGitPackage;
    #config;
    #cliConfig;
    #workspaces;
    #subPackages;
    #git;
    #wiki;
    #docs;
    #localization;
    #rootSlug;
    #parentSlug;

    constructor ( root, { rootPackage, parentPackage } = {} ) {
        this.#root = root;
        this.#rootPackage = rootPackage;
        this.#parentPackage = parentPackage;
    }

    // static
    static new ( dir ) {
        dir = env.findPackageRoot( dir );

        if ( dir ) return new this( dir.replaceAll( "\\", "/" ) );
    }

    static newGit ( dir ) {
        dir = env.findGitPackageRoot( dir );

        if ( dir ) return new this( dir.replaceAll( "\\", "/" ) );
    }

    // properties
    get root () {
        return this.#root;
    }

    get rootPackage () {
        return this.#rootPackage;
    }

    get parentPackage () {
        return this.#parentPackage;
    }

    get rootSlug () {
        if ( this.#rootSlug === undefined ) {
            if ( this.rootPackage ) {
                this.#rootSlug = _path.posix.relative( this.rootPackage.root, this.root ).replaceAll( "\\", "/" );
            }
            else {
                this.#rootSlug = null;
            }
        }

        return this.#rootSlug;
    }

    get parentSlug () {
        if ( this.#parentSlug === undefined ) {
            if ( this.parentPackage ) {
                this.#parentSlug = _path.posix.relative( this.parentPackage.root, this.root ).replaceAll( "\\", "/" );
            }
            else {
                this.#parentSlug = null;
            }
        }

        return this.#parentSlug;
    }

    get isPackage () {
        this.#isPackage ??= env.isPackageRoot( this.root );

        return this.#isPackage;
    }

    get isGitPackage () {
        this.#isGitPackage ??= env.isGitPackageRoot( this.root );

        return this.#isGitPackage;
    }

    get hasDockerfile () {
        return fs.existsSync( this.root + "/Dockerfile" );
    }

    get hasCliConfig () {
        return fs.existsSync( this.root + "/cli.config.yaml" );
    }

    get git () {
        if ( !this.#git ) {
            this.#git = new Git( this.root );
        }

        return this.#git;
    }

    get config () {
        if ( !this.#config ) this.#config = readConfig( this.root + "/package.json" );

        return this.#config;
    }

    get cliConfig () {
        if ( !this.#cliConfig ) {
            let cliConfig;

            if ( this.hasCliConfig ) {
                cliConfig = mergeObjects( {}, defaultCliConfig, readConfig( this.root + "/cli.config.yaml" ) );
            }
            else {
                cliConfig = mergeObjects( {}, defaultCliConfig );
            }

            if ( !validateCliConfig( cliConfig ) ) throw `CLI config is not valid:\n${ validateCliConfig.errors }`;

            this.#cliConfig = cliConfig;
        }

        return this.#cliConfig;
    }

    get name () {
        return this.config.name;
    }

    get version () {
        return new Semver( this.config.version );
    }

    get isPrivate () {
        return !!this.config.private;
    }

    get workspaces () {
        BREAK: if ( this.#workspaces == null ) {
            this.#workspaces = [];

            const workspaces = this.config.workspaces;

            if ( !workspaces ) break BREAK;

            for ( const pattern of workspaces ) {
                const root = this.#root + "/" + pattern;

                if ( env.isPackageRoot( root ) ) {
                    this.#workspaces.push( new this.constructor( root, {
                        "rootPackage": this.isGitPackage
                            ? this
                            : this.rootPackage,
                        "parentPackage": this,
                    } ) );
                }
            }
        }

        return this.#workspaces;
    }

    get subPackages () {
        BREAK: if ( !this.#subPackages ) {
            this.#subPackages = [];

            const subPackages = this.cliConfig.subPackages;

            if ( !subPackages ) break BREAK;

            for ( const pkg of glob( subPackages, {
                "cwd": this.#root,
                "files": false,
                "directories": true,
            } ) ) {
                const root = this.#root + "/" + pkg;

                if ( env.isPackageRoot( root ) ) {
                    const pkg = new this.constructor( root, {
                        "rootPackage": this.isGitPackage
                            ? this
                            : this.rootPackage,
                        "parentPackage": this,
                    } );

                    this.#subPackages.push( pkg, ...pkg.subPackages );
                }
            }
        }

        return this.#subPackages;
    }

    get wiki () {
        if ( !this.#wiki ) {
            this.#wiki = new Wiki( this );
        }

        return this.#wiki;
    }

    get docs () {
        if ( !this.#docs ) {
            this.#docs = new Docs( this );
        }

        return this.#docs;
    }

    get npmUrl () {
        if ( this.isPrivate || !this.name ) return null;

        return `https://www.npmjs.com/package/${ this.name }`;
    }

    get localization () {
        this.#localization ??= new Localization( this );

        return this.#localization;
    }

    get workspacePath () {
        env.loadUserEnv();

        const workspace = process.env[ "SOFTVISIO_CLI_WORKSPACE_" + process.platform ];

        if ( !workspace ) return null;

        return _path.posix.relative( workspace, this.root );
    }

    get isDependenciesLocked () {
        return this.hasPackageLock || this.hasNpmShrinkwrap;
    }

    get hasPackageLock () {
        return fs.existsSync( this.root + "/package-lock.json" );
    }

    get hasNpmShrinkwrap () {
        return fs.existsSync( this.root + "/npm-shrinkwrap.json" );
    }

    // public
    patchVersion ( version ) {
        const root = this.root;

        // update package.json
        const pkg = readConfig( root + "/package.json" );
        pkg.version = version;
        writeConfig( root + "/package.json", pkg, { "readable": true } );

        // update npm-shrinkwrap.json
        if ( fs.existsSync( root + "/npm-shrinkwrap.json" ) ) {
            const data = readConfig( root + "/npm-shrinkwrap.json" );
            data.version = version;
            if ( data.packages && data.packages[ "" ] ) data.packages[ "" ].version = version;
            writeConfig( root + "/npm-shrinkwrap.json", data, { "readable": true } );
        }

        // update package-lock.json
        if ( fs.existsSync( root + "/package-lock.json" ) ) {
            const data = readConfig( root + "/package-lock.json" );
            data.version = version;
            if ( data.packages && data.packages[ "" ] ) data.packages[ "" ].version = version;
            writeConfig( root + "/package-lock.json", data, { "readable": true } );
        }

        // update cordova config.xml
        if ( fs.existsSync( root + "/config.xml" ) ) {
            var xml = fs.readFileSync( root + "/config.xml", "utf8" ),
                replaced;

            xml = xml.replace( /(<widget[^>]+version=")\d+\.\d+\.\d+(")/, ( ...match ) => {
                replaced = true;

                return match[ 1 ] + version + match[ 2 ];
            } );

            if ( replaced ) fs.writeFileSync( root + "/config.xml", xml );
        }
    }

    async publishNpm ( latestTag, nextTag ) {
        if ( !this.name || this.isPrivate ) return;

        this.#clearCache();

        const addTags = [ latestTag, nextTag ].filter( tag => tag ).map( tag => `"${ tag }"` ),
            removeTags = [];

        // publish npm package
        var params = [ "publish", "--access", "public" ];
        if ( addTags.length ) {
            params.push( "--tag", addTags.shift() );
        }
        else {
            params.push( "--tag", "no-tag" );
            removeTags.push( "no-tag" );
        }
        params.push( `"${ this.root }"` );

        while ( true ) {
            console.log( "Publishing:", "npm", params.join( " " ) );

            const res = childProcess.spawnSync( "npm", params, { "shell": true, "stdio": "inherit" } );

            // error
            if ( res.status ) {
                console.log( `Unable to publish to the npm registry` );

                if ( ( await confirm( "Repeat?", [ "yes", "no" ] ) ) === "yes" ) continue;
            }

            break;
        }

        // add additional tags
        if ( addTags.length ) {
            for ( const tag of addTags ) {
                params = [ "dist-tag", "add", `"${ this.name + "@" + this.version }"`, tag ];

                while ( true ) {
                    console.log( "Adding tag:", "npm", params.join( " " ) );

                    const res = childProcess.spawnSync( "npm", params, { "shell": true, "stdio": "inherit" } );

                    // error
                    if ( res.status ) {
                        console.log( `Unable to add tag "${ tag }"` );

                        if ( ( await confirm( "Repeat?", [ "yes", "no" ] ) ) === "yes" ) continue;
                    }

                    break;
                }
            }
        }

        // remove temporary tags
        if ( removeTags.length ) {
            for ( const tag of removeTags ) {
                params = [ "dist-tag", "rm", `"${ this.name }"`, tag ];

                while ( true ) {
                    console.log( "Removing tag:", "npm", params.join( " " ) );

                    const res = childProcess.spawnSync( "npm", params, { "shell": true, "stdio": "inherit" } );

                    // error
                    if ( res.status ) {
                        console.log( `Unable to remove tag "${ tag }"` );

                        if ( ( await confirm( "Repeat?", [ "yes", "no" ] ) ) === "yes" ) continue;
                    }

                    break;
                }
            }
        }
    }

    hasPreReleaseDependencies () {
        const config = this.config;

        for ( const name of [ "dependencies", "devDependencies", "peerDependencies", "optionalDependencies" ] ) {
            if ( !config[ name ] ) continue;

            for ( const dependencyName in config[ name ] ) {
                const version = config[ name ][ dependencyName ];

                // process known tags
                if ( version === "latest" ) {
                    continue;
                }
                else if ( version === "next" ) {
                    return result( [ 500, `Package "${ this.name }" has pre-release dependency "${ dependencyName }@${ version }"` ] );
                }

                let dependencyRange;

                // detect git url
                const match = version.match( /#semver:(.+)$/ );

                if ( match ) {
                    dependencyRange = match[ 1 ];
                }
                else {
                    dependencyRange = version;
                }

                dependencyRange = new Semver.Range( dependencyRange );

                try {
                    if ( dependencyRange.isPreRelease ) {
                        return result( [ 500, `Package "${ this.name }" has pre-release dependency "${ dependencyName }@${ version }"` ] );
                    }
                }
                catch {
                    return result( [ 500, `Unable to parse dependency version "${ dependencyName }@ ${ version }"` ] );
                }
            }
        }

        return result( 200 );
    }

    async release ( { preRelease, yes } = {} ) {
        const { "default": Release } = await import( "./package/release.js" );

        const release = new Release( this, {
            preRelease,
            yes,
        } );

        return release.run();
    }

    async updateMetadata ( { commit, push, homepage, author, license, dependabot } = {} ) {
        env.loadUserEnv();

        // get git status
        var res = await this.git.getIsDirty();
        if ( !res.ok ) return res;

        // package is dirty
        if ( res.data.isDirty ) return result( [ 500, "Package has uncommited changes" ] );

        const upstream = this.git.upstream,
            packages = [ this, ...this.subPackages ],
            fileTree = new FileTree();

        for ( const pkg of packages ) {
            const config = readConfig( pkg.root + "/package.json" );

            // homepage
            if ( !config.homepage || homepage ) {
                config.homepage = ( pkg.docs.isExists && upstream.docsUrl ) || upstream.homeUrl;
            }

            // bugs
            config.bugs = {
                "url": upstream.issuesUrl,
                "email": process.env.META_BUGS_EMAIL || process.env.META_AUTHOR,
            };

            // repository
            config.repository = {
                "type": "git",
                "url": "git+" + upstream.httpsCloneUrl,
            };

            if ( pkg.rootSlug ) {
                config.repository.directory = pkg.rootSlug;
            }
            else {
                delete config.repository.directory;
            }

            // license
            if ( !config.license || license ) {
                config.license = config.private
                    ? process.env.META_LICENSE_PRIVATE
                    : process.env.META_LICENSE_PUBLIC;
            }

            // author
            if ( !config.author || author ) {
                config.author = process.env.META_AUTHOR;
            }

            // scripts
            if ( pkg.hasCliConfig ) {

                // "test" script
                if ( glob( "_tests/**/*.test.js", { "cwd": pkg.root } ).length ) {
                    config.scripts ??= {};
                    config.scripts.test = "node --test _tests/**/*.test.js";
                }
                else {
                    delete config.scripts?.test;
                }

                if ( config.scripts && objectIsEmpty( config.scripts ) ) {
                    delete config.scripts;
                }
            }

            fileTree.add( {
                "path": ( pkg.rootSlug || "" ) + "/package.json",
                "buffer": JSON.stringify( config, null, 4 ) + "\n",
            } );

            // chmod
            res = await pkg.updateFilesMode();
            if ( !res.ok ) return res;
        }

        // dependabot
        if ( dependabot ) {
            res = await this.#updateDependabotConfig();

            if ( !res.ok ) return res;

            if ( res.data ) {
                fileTree.add( res.data );
            }
        }

        // write file tree
        await fileTree.write( this.root );

        // get git status
        res = await this.git.getIsDirty();
        if ( !res.ok ) return res;

        const updated = res.data.isDirty;

        if ( !updated ) return result( 304 );

        // commit and push
        if ( commit ) {

            // add changes
            res = await this.git.run( "add", "." );
            if ( !res.ok ) return res;

            // commit changes
            res = await this.git.run( "commit", "-m", "chore: update package metadata" );
            if ( !res.ok ) return res;

            if ( push ) {
                res = await this.git.run( "push" );
                if ( !res.ok ) return res;
            }
        }

        return result( [ 200, "Updated" ] );
    }

    async updateFilesMode () {
        if ( !this.cliConfig.metadata?.executables ) return result( 200 );

        var res;

        const packagePatterns = new GlobPatterns().add( "**" );
        for ( const pkg of this.subPackages ) {
            packagePatterns.add( "!" + pkg.parentSlug + "/**" );
        }

        res = await this.git.run( "ls-files", "--format", "%(objectmode) %(path)" );
        if ( !res ) return res;

        const files = Object.fromEntries( res.data
            .split( "\n" )
            .map( line => line.split( " ", 2 ).reverse() )
            .filter( ( [ path, mode ] ) => path && packagePatterns.test( path ) )
            .map( ( [ path, mode ] ) => [ path, mode.endsWith( "755" ) ] ) );

        const executablePatterns = new GlobPatterns().add( this.cliConfig.metadata.executables );

        const setX = [],
            dropX = [];

        for ( const [ path, executable ] of Object.entries( files ) ) {
            if ( executablePatterns.test( path ) ) {
                if ( !executable ) setX.push( path );
            }
            else {
                if ( executable ) dropX.push( path );
            }
        }

        if ( setX.length ) {
            res = await this.git.run( "update-index", "--chmod=+x", ...setX );

            if ( !res.ok ) return res;

            for ( const file of setX ) {
                chmodSync( this.root + "/" + file, "+x" );
            }
        }

        if ( dropX.length ) {
            res = await this.git.run( "update-index", "--chmod=-x", ...dropX );

            if ( !res.ok ) return res;

            for ( const file of dropX ) {
                chmodSync( this.root + "/" + file, "-x" );
            }
        }

        return result( 200 );
    }

    runCommand ( command, ...args ) {
        console.log( "" );
        console.log( "Package:", ansi.hl( this.workspacePath ) );

        const res = childProcess.spawnSync( command, args, {
            "cwd": this.root,
            "stdio": "inherit",
            "shell": true,
        } );

        if ( res.status ) {
            return result( 500 );
        }
        else {
            return result( 200 );
        }
    }

    runScript ( script, argv ) {
        if ( !this.config.scripts?.[ script ] ) return result( 200 );

        console.log( "" );
        console.log( "Package:", ansi.hl( this.workspacePath ) );

        if ( argv?.length ) {
            argv = [ "--", ...argv ];
        }
        else {
            argv = [];
        }

        const res = childProcess.spawnSync( "npm", [ "run", script, ...argv ], {
            "cwd": this.root,
            "stdio": "inherit",
            "shell": true,
        } );

        if ( res.status ) {
            return result( 500 );
        }
        else {
            return result( 200 );
        }
    }

    async getOutdatedDependencies ( { all } = {} ) {
        return new Promise( resolve => {
            childProcess.exec(
                "npm outdated --json" + ( all
                    ? " --all"
                    : "" ),
                {
                    "cwd": this.root,
                    "maxBuffer": Infinity,
                },
                ( error, stdout ) => {
                    try {
                        const dependencies = JSON.parse( stdout );

                        resolve( result( 200, dependencies ) );
                    }
                    catch {
                        resolve( result( 500 ) );
                    }
                }
            );
        } );
    }

    async updateDependencies ( { install, all, updatable, missing, internal = true, external = true, quiet, commit, yes, cache, outdatedDependencies } = {} ) {
        cache ||= {};

        var res;

        // get outdated dependencies
        if ( !outdatedDependencies ) {
            res = await this.getOutdatedDependencies( { all } );

            if ( !res.ok ) return res;

            outdatedDependencies = res.data;
        }

        var canUpdate;

        const updateDependencies = [];

        for ( const name in outdatedDependencies ) {
            let specs;

            if ( Array.isArray( outdatedDependencies[ name ] ) ) {
                specs = outdatedDependencies[ name ];
            }
            else {
                specs = [ outdatedDependencies[ name ] ];
            }

            // filter not updatable dependencies
            if ( updatable ) {
                const locations = {};

                for ( const spec of specs ) {

                    // not updatable
                    if ( spec.current === spec.wanted ) {
                        locations[ spec.location ] = false;
                    }

                    // updatable
                    else if ( locations[ spec.location ] !== false ) {
                        locations[ spec.location ] = spec;
                    }
                }

                specs = Object.values( locations ).filter( spec => !!spec );
            }

            for ( const spec of specs ) {

                // misseing dependency
                if ( !missing && !spec.current ) continue;

                if ( !internal || !external ) {

                    // get internal packages
                    if ( !cache.internalPackages ) {
                        cache.internalPackages = new Set();

                        const res = findWorkspacePackages();
                        if ( !res.ok ) return res;

                        for ( const pkg of res.data ) {
                            cache.internalPackages.add( pkg.name );
                        }
                    }

                    if ( !internal && cache.internalPackages.has( name ) ) continue;

                    if ( !external && !cache.internalPackages.has( name ) ) continue;
                }

                // dependency can be updated
                if ( spec.current !== spec.wanted ) {
                    canUpdate = true;
                }

                if ( spec.wanted === spec.latest ) {
                    spec.updatable = true;
                }
                else {
                    spec.updatable = false;
                }

                updateDependencies.push( {
                    name,
                    ...spec,
                } );
            }
        }

        if ( !updateDependencies.length ) return result( 200 );

        console.log( "" );
        console.log( "Package:", ansi.hl( this.workspacePath ) );

        if ( !quiet ) {
            new Table( {
                "columns": {
                    "name": {
                        "title": ansi.hl( "DEPENDENCY" ),
                        "headerAlign": "center",
                        "headerValign": "end",
                    },
                    "dependent": {
                        "title": ansi.hl( "DEPENDENT" ),
                        "headerAlign": "center",
                        "headerValign": "end",
                    },
                    "current": {
                        "title": ansi.hl( "INSTALLED" ),
                        "headerAlign": "center",
                        "headerValign": "end",
                        "align": "end",
                        "width": 14,
                        "format": value => {
                            return value || "-";
                        },
                    },
                    "wanted": {
                        "title": ansi.hl( "WANTED" ),
                        "headerAlign": "center",
                        "headerValign": "end",
                        "align": "end",
                        "width": 14,
                        "format": ( value, row ) => {
                            if ( row.updatable ) {
                                return ansi.ok( " " + value + " " );
                            }
                            else {
                                return " " + value + " ";
                            }
                        },
                    },
                    "latest": {
                        "title": ansi.hl( "LATEST" ),
                        "headerAlign": "center",
                        "headerValign": "end",
                        "align": "end",
                        "width": 14,
                        "format": ( value, row ) => {
                            if ( !value ) {
                                return ansi.error( " NOT FOUND " );
                            }
                            else if ( !row.updatable ) {
                                return ansi.error( " " + value + " " );
                            }
                            else {
                                return " " + value + " ";
                            }
                        },
                    },
                },
            } )
                .pipe( process.stdout )
                .add( ...updateDependencies )
                .end();
        }

        // nothing to update
        if ( !install || !canUpdate ) return result( 200 );

        if ( !yes ) {
            res = await confirm( "Update dependencies?", [ "no", "yes" ] );

            if ( res === "no" ) return result( 200 );
        }

        // package dependencies are locked
        if ( this.isDependenciesLocked ) {

            // get git status
            res = await this.git.getIsDirty();
            if ( !res.ok ) return res;

            // package is dirty
            if ( res.data.isDirty ) {
                console.log( "Package has uncommited changed, update is not possible" );

                return result( 500 );
            }
        }

        // perform update
        process.stdout.write( "Updating dependencies ... " );

        res = childProcess.spawnSync( "npm", [ "update", "--json" ], {
            "cwd": this.root,
            "stdio": [ "ignore", "pipe", "ignore" ],
            "shell": true,
        } );

        // update failed
        if ( res.status ) {
            console.log( ansi.error( " ERROR " ) );

            const output = JSON.parse( res.stdout );

            console.log( output.error.summary );
            console.log( output.error.detail );

            return result( 500 );
        }
        else {
            console.log( ansi.ok( " OK " ) );
        }

        // commit and push
        if ( commit && this.isDependenciesLocked ) {
            process.stdout.write( "Commit and push ... " );

            try {

                // get git status
                res = await this.git.getIsDirty();
                if ( !res.ok ) throw res;

                // package is dirty
                if ( res.data.isDirty ) {
                    const add = [];

                    if ( this.hasPackageLock ) {
                        add.push( "package-lock.json" );
                    }

                    if ( this.hasNpmShrinkwrap ) {
                        add.push( "npm-shrinkwrap.json" );
                    }

                    if ( add.length ) {

                        // add changes
                        res = await this.git.run( "add", ...add );
                        if ( !res.ok ) throw res;

                        // commit changes
                        res = await this.git.run( "commit", "-m", "chore: update package dependencies" );
                        if ( !res.ok ) throw res;

                        // push
                        res = await this.git.run( "push" );
                        if ( !res.ok ) throw res;
                    }
                }

                console.log( ansi.ok( " OK " ) );
            }
            catch ( e ) {
                console.log( ansi.error( e + "" ) );

                return e;
            }
        }

        return result( 200 );
    }

    test ( { log } = {} ) {
        var res;

        if ( !this.config.scripts?.test ) {
            res = result( [ 200, "No tests to run" ] );
        }
        else {
            res = childProcess.spawnSync( "npm", [ "test" ], {
                "cwd": this.root,
                "stdio": "inherit",
            } );

            if ( res.status ) {
                res = result( [ 500, "Tests failed" ] );
            }
            else {
                res = result( 200 );
            }
        }

        if ( log ) {
            console.log( `Tests result "${ this.name }":`, res + "" );
        }

        return res;
    }

    // private
    #clearCache () {
        this.#config = null;
    }

    async #updateDependabotConfig () {
        const upstream = this.git.upstream;

        if ( !upstream.isGitHub ) return result( 200 );

        var filename,
            config,
            updates = new Map();

        if ( fs.existsSync( this.root + "/.github/dependabot.yaml" ) ) {
            filename = "dependabot.yaml";

            config = readConfig( this.root + "/.github/dependabot.yaml" );
        }
        else if ( fs.existsSync( this.root + "/.github/dependabot.yml" ) ) {
            filename = "dependabot.yml";

            config = readConfig( this.root + "/.github/dependabot.yml" );
        }
        else {
            filename = "dependabot.yaml";
        }

        if ( config ) {
            for ( const update of config.updates || [] ) {
                if ( update[ "package-ecosystem" ] === "npm" ) continue;

                if ( update[ "package-ecosystem" ] === "docker" ) continue;

                if ( update[ "package-ecosystem" ] === "github-actions" ) continue;

                updates.set( update[ "package-ecosystem" ], update );
            }
        }

        // npm
        NPM: {
            const directories = [];

            for ( const pkg of [ this, ...this.subPackages ] ) {
                if ( pkg.config.dependencies || pkg.config.devDependencies || pkg.config.peerDependencies ) {
                    directories.push( "/" + ( pkg.rootSlug || "" ) );
                }
            }

            if ( !directories.length ) break NPM;

            updates.set( "npm", {
                "package-ecosystem": "npm",
                "directories": directories.sort(),
                "schedule": {
                    "interval": "daily",
                },
                "open-pull-requests-limit": 5,
            } );
        }

        // docker
        if ( this.hasDockerfile ) {
            updates.set( "docker", {
                "package-ecosystem": "docker",
                "directories": [ "/" ],
                "schedule": {
                    "interval": "daily",
                },
                "open-pull-requests-limit": 5,
            } );
        }

        // github-actions
        if ( glob( ".github/workflows/*.*", { "cwd": this.root } ).length ) {
            updates.set( "github-actions", {
                "package-ecosystem": "github-actions",
                "directories": [ "/" ],
                "schedule": {
                    "interval": "daily",
                },
                "open-pull-requests-limit": 5,
            } );
        }

        if ( !updates.size ) {
            if ( fs.existsSync( this.root + "/.github" ) ) {
                await fs.promises.rm( this.root + "/.github/" + filename, {
                    "force": true,
                } );

                const files = await fs.promises.readdir( this.root + "/.github" );

                if ( !files.length ) {
                    await fs.promises.rm( this.root + "/.github", {
                        "recursive": true,
                    } );
                }
            }

            return result( 200 );
        }

        config = {
            "version": 2,
            "updates": [],
        };

        for ( const update of [ ...updates.keys() ].sort() ) {
            config.updates.push( updates.get( update ) );
        }

        return result(
            200,
            new File( {
                "path": "/.github/" + filename,
                "buffer": yaml.stringify( config ),
            } )
        );
    }
}
