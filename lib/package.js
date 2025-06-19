import "#core/temporal";
import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import Ajv from "#core/ajv";
import ansi from "#core/ansi";
import GitHubApi from "#core/api/github";
import { readConfig, readConfigSync, writeConfigSync } from "#core/config";
import env from "#core/env";
import File from "#core/file";
import FileTree from "#core/file-tree";
import { chmodSync, exists } from "#core/fs";
import { glob, globSync } from "#core/glob";
import GlobPatterns from "#core/glob/patterns";
import Locale from "#core/locale";
import SemanticVersion from "#core/semantic-version";
import SemanticVersionRange from "#core/semantic-version/range";
import Table from "#core/text/table";
import { confirm, mergeObjects, objectIsEmpty, repeatAction } from "#core/utils";
import yaml from "#core/yaml";
import Git from "#lib/git";
import lintFile from "#lib/lint/file";
import Docs from "#lib/package/docs";
import Localization from "#lib/package/localization";
import Wiki from "#lib/package/wiki";

const validateCliConfig = new Ajv().compileFile( import.meta.resolve( "#resources/schemas/cli.config.schema.yaml" ) ),
    defaultCliConfig = await readConfig( "#resources/cli.config.yaml", { "resolve": import.meta.url } );

export default class Package {
    #root;
    #rootPackage;
    #parentPackage;
    #isGitRoot;
    #isPackage;
    #isGitPackage;
    #config;
    #cliConfig;
    #version;
    #workspaces;
    #subPackages;
    #git;
    #wiki;
    #docs;
    #localization;
    #rootSlug;
    #parentSlug;
    #dependencies;

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

    static newGitRoot ( dir ) {
        dir = env.findGitRoot( dir );

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
                this.#rootSlug = path.relative( this.rootPackage.root, this.root ).replaceAll( "\\", "/" );
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
                this.#parentSlug = path.relative( this.parentPackage.root, this.root ).replaceAll( "\\", "/" );
            }
            else {
                this.#parentSlug = null;
            }
        }

        return this.#parentSlug;
    }

    get isGitRoot () {
        this.#isGitRoot ??= env.isGitRoot( this.root );

        return this.#isGitRoot;
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
        return fs.existsSync( this.root + "/dockerfile" ) || fs.existsSync( this.root + "/Dockerfile" );
    }

    get git () {
        if ( !this.#git ) {
            this.#git = new Git( this.root );
        }

        return this.#git;
    }

    get config () {
        if ( this.#config === undefined ) {
            this.#config = this.isPackage
                ? readConfigSync( this.root + "/package.json" )
                : null;
        }

        return this.#config;
    }

    get cliConfig () {
        if ( this.#cliConfig === undefined ) {
            this.#cliConfig = null;

            if ( fs.existsSync( this.root + "/cli.config.yaml" ) ) {
                const cliConfig = mergeObjects( {}, defaultCliConfig, readConfigSync( this.root + "/cli.config.yaml" ) );

                if ( !validateCliConfig( cliConfig ) ) throw `CLI config is not valid:\n${ validateCliConfig.errors }`;

                this.#cliConfig = cliConfig;
            }
        }

        return this.#cliConfig;
    }

    get name () {
        return this.config?.name;
    }

    get version () {
        if ( this.#version === undefined ) {
            try {
                this.#version = SemanticVersion.new( this.config?.version );
            }
            catch {
                this.#version = null;
            }
        }

        return this.#version;
    }

    get isPrivate () {
        return this.config
            ? Boolean( this.config.private )
            : true;
    }

    get isReleaseEnabled () {
        if ( !this.isGitPackage ) return false;

        if ( !this.cliConfig ) return false;

        return this.cliConfig.release.enabled;
    }

    get workspaces () {
        BREAK: if ( !this.#workspaces ) {
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

            const subPackages = this.cliConfig?.subPackages;

            if ( !subPackages ) break BREAK;

            for ( const pkg of globSync( subPackages, {
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

    get docsUrl () {
        if ( !this.git.upstream ) {
            return null;
        }
        else if ( this.cliConfig?.docs?.location ) {
            return this.git.upstream.docsUrl;
        }
        else {
            return this.git.upstream.readmeUrl;
        }
    }

    get npmUrl () {
        if ( !this.name ) return null;

        if ( this.isPrivate || !this.name ) return null;

        return `https://www.npmjs.com/package/${ this.name }`;
    }

    get localization () {
        this.#localization ??= new Localization( this );

        return this.#localization;
    }

    get workspaceSlug () {
        env.loadUserEnv();

        const workspace = process.env[ "SOFTVISIO_CLI_WORKSPACE_" + process.platform.toUpperCase() ];

        if ( !workspace ) return null;

        return path.relative( workspace, this.root ).replaceAll( "\\", "/" );
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

    get dependencies () {
        if ( !this.#dependencies ) {
            this.#dependencies = new Map( Object.entries( {
                ...this.config.dependencies,
                ...this.config.devDependencies,
                ...this.config.peerDependencies,
                ...this.config.optionalDependencies,
            } ) );
        }

        return this.#dependencies;
    }

    get hasDependencies () {
        return Boolean( this.dependencies.size );
    }

    // public
    patchVersion ( version ) {
        const root = this.root;

        // update package.json
        const pkg = readConfigSync( root + "/package.json" );
        pkg.version = version;
        writeConfigSync( root + "/package.json", pkg, { "readable": true } );

        // update npm-shrinkwrap.json
        if ( fs.existsSync( root + "/npm-shrinkwrap.json" ) ) {
            const data = readConfigSync( root + "/npm-shrinkwrap.json" );
            data.version = version;
            if ( data.packages && data.packages[ "" ] ) data.packages[ "" ].version = version;
            writeConfigSync( root + "/npm-shrinkwrap.json", data, { "readable": true } );
        }

        // update package-lock.json
        if ( fs.existsSync( root + "/package-lock.json" ) ) {
            const data = readConfigSync( root + "/package-lock.json" );
            data.version = version;
            if ( data.packages && data.packages[ "" ] ) data.packages[ "" ].version = version;
            writeConfigSync( root + "/package-lock.json", data, { "readable": true } );
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

        const addTags = [ latestTag, nextTag ].filter( tag => tag ).map( tag => `"${ tag }"` );

        // publish npm package
        const params = [ "publish", "--access", "public" ];

        if ( addTags.length ) {
            params.push( "--tag", addTags.shift() );
        }

        params.push( `"${ this.root }"` );

        const res = await repeatAction( async () => {
            console.log( "Publishing:", "npm", params.join( " " ) );

            const res = childProcess.spawnSync( "npm", params, {
                "shell": true,
                "stdio": "pipe",
            } );

            if ( res.status ) {
                console.log( res.stderr + "" );

                console.log( `Unable to publish to the npm registry` );

                return result( 500 );
            }
            else {
                return result( 200 );
            }
        } );
        if ( !res.ok ) return res;

        // add additional tags
        if ( addTags.length ) {
            for ( const tag of addTags ) {
                const params = [ "dist-tag", "add", `"${ this.name }@${ this.version }"`, tag ];

                const res = await repeatAction( async () => {
                    console.log( "Adding npm tag:", "npm", params.join( " " ) );

                    const res = childProcess.spawnSync( "npm", params, {
                        "shell": true,
                        "stdio": "pipe",
                    } );

                    // error
                    if ( res.status ) {
                        console.log( res.stderr + "" );

                        console.log( `Unable to add tag "${ tag }"` );

                        return result( 500 );
                    }
                    else {
                        return result( 200 );
                    }
                } );
                if ( !res.ok ) return res;
            }
        }

        return result( 200 );
    }

    hasPreReleaseDependencies () {
        for ( const [ name, version ] of this.dependencies.entries() ) {

            // process known tags
            if ( version === "latest" ) {
                continue;
            }
            else if ( version === "next" ) {
                return result( [ 500, `Package "${ this.name }" has pre-release dependency "${ name }@${ version }"` ] );
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

            dependencyRange = new SemanticVersionRange( dependencyRange );

            try {
                if ( dependencyRange.isPreRelease ) {
                    return result( [ 500, `Package "${ this.name }" has pre-release dependency "${ name }@${ version }"` ] );
                }
            }
            catch {
                return result( [ 500, `Unable to parse dependency version "${ name }@ ${ version }"` ] );
            }
        }

        return result( 200 );
    }

    async release ( { preReleaseTag, yes } = {} ) {
        const { "default": Release } = await import( "./package/release.js" );

        return new Release( this, {
            preReleaseTag,
            yes,
        } );
    }

    async archive ( { unarchive } = {} ) {
        const upstream = this.git.upstream;

        if ( !upstream.isGitHub ) return result( [ 400, "Repository upstream is not GitHub" ] );

        env.loadUserEnv();

        if ( !process.env.GITHUB_TOKEN ) return result( [ 400, "GitHub token is not provided" ] );

        const gitHubApi = new GitHubApi( process.env.GITHUB_TOKEN );

        var res,
            updated = false;

        // get repository settings
        res = await gitHubApi.getRepository( upstream.repositorySlug );
        if ( !res.ok ) return res;

        if ( res.data.archived !== !unarchive ) {
            res = await gitHubApi.updateRepository( upstream.repositorySlug, {
                "archived": !unarchive,
            } );
            if ( !res.ok ) return res;

            updated = true;
        }

        return result( 200, {
            updated,
        } );
    }

    async updateMetadata ( { repository, dependabot, commit, log } = {} ) {
        var res,
            report = "";

        // configure upstream repository
        if ( repository ) {
            res = await this.configureUpstreamRepository();

            const reportText = "Configure upstream repository: " + ( res.ok
                ? ( res.data.updated
                    ? ansi.ok( " Updated " )
                    : "Not modified" )
                : ansi.error( " " + res.statusText + " " ) );

            if ( log ) console.log( reportText );

            report += reportText + "\n";

            if ( !res.ok ) {
                return result( res, {
                    "log": report,
                } );
            }
        }

        // update metadata
        {
            res = await this.#updateMetadata( { dependabot, commit } );

            const reportText = "Update metadata: " + ( res.ok
                ? ( res.data.updated
                    ? ansi.ok( " Updated " )
                    : "Not modified" )
                : ansi.error( " " + res.statusText + " " ) );

            if ( log ) console.log( reportText );

            report += reportText + "\n";

            if ( !res.ok ) {
                return result( res, {
                    "log": report,
                } );
            }
        }

        return result( 200, {
            "log": report,
        } );
    }

    async updateFilesMode () {
        if ( !this.cliConfig?.meta?.executables ) return result( 200 );

        var res;

        const packagePatterns = new GlobPatterns().add( "**" );
        for ( const pkg of this.subPackages ) {
            packagePatterns.add( "!" + pkg.parentSlug + "/**" );
        }

        res = await this.git.exec( [ "ls-files", "--format", "%(objectmode) %(path)" ] );
        if ( !res ) return res;

        const files = Object.fromEntries( res.data
            .split( "\n" )
            .map( line => line.split( " ", 2 ).reverse() )
            .filter( ( [ path, mode ] ) => path && packagePatterns.test( path ) )
            .map( ( [ path, mode ] ) => [ path, mode.endsWith( "755" ) ] ) );

        const executablePatterns = new GlobPatterns().add( this.cliConfig.meta.executables );

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
            res = await this.git.exec( [ "update-index", "--chmod=+x", ...setX ] );

            if ( !res.ok ) return res;

            if ( process.platform !== "win32" ) {
                for ( const file of setX ) {
                    chmodSync( this.root + "/" + file, "+x" );
                }
            }
        }

        if ( dropX.length ) {
            res = await this.git.exec( [ "update-index", "--chmod=-x", ...dropX ] );

            if ( !res.ok ) return res;

            if ( process.platform !== "win32" ) {
                for ( const file of dropX ) {
                    chmodSync( this.root + "/" + file, "-x" );
                }
            }
        }

        return result( 200 );
    }

    runCommand ( command, ...args ) {
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
        if ( !this.hasDependencies ) return result( 200 );

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

    async updateDependencies ( { all, outdated, linked, missing, install, reinstall, commit, force, quiet, confirmInstall, outdatedDependencies, cache = {} } = {} ) {
        if ( !this.hasDependencies ) return result( 200 );

        var res;

        // get outdated dependencies
        if ( !outdatedDependencies ) {
            res = await this.getOutdatedDependencies( { all } );

            if ( !res.ok ) return res;

            outdatedDependencies = res.data;
        }

        outdatedDependencies ||= {};

        // add linked deps
        if ( linked ) {
            const linkedDependencies = await this.#getLinkedDependencies();

            for ( const dependency of linkedDependencies.values() ) {
                if ( !outdatedDependencies[ dependency.name ] ) {
                    outdatedDependencies[ dependency.name ] = [];
                }
                else if ( !Array.isArray( outdatedDependencies[ dependency.name ] ) ) {
                    outdatedDependencies[ name ] = [ outdatedDependencies[ dependency.name ] ];
                }

                outdatedDependencies[ dependency.name ].push( {
                    "location": "-",
                    "linked": dependency.link || true,
                } );
            }
        }

        var hasUpdates;

        const updateDependencies = [];

        for ( const name in outdatedDependencies ) {
            let specs;

            if ( Array.isArray( outdatedDependencies[ name ] ) ) {
                specs = outdatedDependencies[ name ];
            }
            else {
                specs = [ outdatedDependencies[ name ] ];
            }

            const index = {},
                locations = {};

            for ( const spec of specs ) {

                // group specs by id
                const id = `${ spec.location }/${ spec.current }/${ spec.wanted }/${ spec.latest }`;

                index[ id ] ??= {
                    name,
                    "current": spec.current,
                    "wanted": spec.wanted,
                    "latest": spec.latest,
                    "location": spec.location,
                    "dependent": new Set(),
                    "linked": spec.linked,
                };

                index[ id ].dependent.add( spec.dependent );

                // detect updatable by location
                if ( spec.current === spec.wanted ) {
                    locations[ spec.location ] = false;
                }
                else if ( locations[ spec.location ] !== false ) {
                    locations[ spec.location ] = true;
                }
            }

            specs = Object.values( index ).map( spec => {
                spec.dependent = [ ...spec.dependent ].sort().join( ", " );

                return spec;
            } );

            for ( const spec of specs ) {

                // updatable dependency
                spec.updatable = locations[ spec.location ];

                // not-outdated dependency, can be updated to the latest version
                if ( spec.wanted === spec.latest ) {
                    spec.outdated = false;
                }

                // outdated dependency, can not be updated to the latest version
                else {
                    spec.outdated = true;
                }

                // include installed, updatable deps by default
                let include = spec.current && spec.updatable;

                // include outdated deps
                if ( outdated && spec.outdated ) {
                    include = true;
                }

                // include linked deps
                if ( linked && spec.linked ) {
                    include = true;
                }

                // include misseing deps
                if ( missing && !spec.current ) {
                    include = true;
                }

                if ( !include ) continue;

                // updatable dependency
                if ( spec.updatable || spec.linked ) {
                    hasUpdates = true;
                }

                updateDependencies.push( {
                    name,
                    ...spec,
                } );
            }
        }

        install = install && ( hasUpdates || reinstall );

        // print report
        if ( install || updateDependencies.length ) {
            if ( !cache.newLine ) {
                cache.newLine = true;
            }
            else {
                console.log();
            }

            console.log( "Package:", ansi.hl( this.workspaceSlug ) );

            if ( updateDependencies.length && !quiet ) {
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
                                return value
                                    ? ` ${ value } `
                                    : " - ";
                            },
                        },
                        "wanted": {
                            "title": ansi.hl( "WANTED" ),
                            "headerAlign": "center",
                            "headerValign": "end",
                            "align": "end",
                            "width": 14,
                            "format": ( value, row ) => {
                                if ( !value ) {
                                    return " - ";
                                }
                                else if ( row.updatable ) {
                                    return ansi.ok( ` ${ value } ` );
                                }
                                else {
                                    return ` ${ value } `;
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
                                    if ( row.linked === true ) {
                                        return ansi.error( " MISSING " );
                                    }
                                    else if ( row.linked ) {
                                        return ansi.error( " LINKED " );
                                    }
                                    else {
                                        return ansi.error( " NOT FOUND " );
                                    }
                                }
                                else if ( row.outdated ) {
                                    return ansi.error( ` ${ value } ` );
                                }
                                else {
                                    return ` ${ value } `;
                                }
                            },
                        },
                    },
                } )
                    .pipe( process.stdout )
                    .add( ...updateDependencies )
                    .end();
            }
        }

        // nothing to update
        if ( !install ) return result( 200 );

        if ( hasUpdates && confirmInstall ) {
            res = await confirm( "Update dependencies?", [ "[yes]", "no" ] );

            if ( res !== "yes" ) return result( 200 );
        }

        // package dependencies are locked
        if ( !force ) {

            // get git status
            res = await this.git.getWorkingTreeStatus();
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

        // get git status
        res = await this.git.getWorkingTreeStatus();
        if ( !res.ok ) return res;

        // package is not dirty
        if ( !res.data.isDirty ) return result( 200 );

        // commit and push
        if ( commit ) {
            process.stdout.write( "Commit and push ... " );

            // add changes
            res = await repeatAction( async () => {
                const res = await this.git.exec( [ "add", "." ] );

                if ( !res.ok ) console.log( ansi.error( res + "" ) );

                return res;
            } );
            if ( !res.ok ) return res;

            // commit changes
            res = await repeatAction( async () => {
                const res = await this.git.exec( [ "commit", "-m", "chore(deps): update package dependencies" ] );

                if ( !res.ok ) console.log( ansi.error( res + "" ) );

                return res;
            } );
            if ( !res.ok ) return res;

            // push changes
            res = await repeatAction( async () => {
                const res = await this.git.exec( [ "push" ] );

                if ( !res.ok ) console.log( ansi.error( res + "" ) );

                return res;
            } );
            if ( !res.ok ) return res;

            console.log( ansi.ok( " OK " ) );
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
                "stdio": "pipe",
            } );

            if ( res.status ) {
                console.log( res.stderr + "" );

                res = result( [ 500, "Tests failed" ] );
            }
            else {
                res = result( 200 );
            }
        }

        if ( log ) {
            console.log( `Tests result "${ this.workspaceSlug }":`, res + "" );
        }

        return res;
    }

    async configureUpstreamRepository () {
        const upstream = this.git.upstream;

        if ( !upstream.isGitHub ) return result( [ 400, "Repository upstream is not GitHub" ] );

        env.loadUserEnv();

        if ( !process.env.GITHUB_TOKEN ) return result( [ 400, "GitHub token is not provided" ] );

        const gitHubApi = new GitHubApi( process.env.GITHUB_TOKEN ),
            repositorySettings = this.cliConfig.meta.repository,
            homepage = ( this.docs.isEnabled && upstream.docsUrl ) || upstream.homeUrl;

        var res,
            data,
            updated = false;

        // get repository settings
        res = await gitHubApi.getRepository( upstream.repositorySlug );
        if ( !res.ok ) return res;

        const currentData = res.data;

        // description
        if ( this.config.description && this.config.description !== currentData.description ) {
            data ??= {};
            data.description = this.config.description;
        }

        // homepage
        if ( currentData.homepage !== homepage ) {
            data ??= {};
            data.homepage = homepage;
        }

        // private
        if ( repositorySettings.private !== null && repositorySettings.private !== currentData.private ) {
            data ??= {};
            data.private = repositorySettings.private;

            currentData.private = repositorySettings.private;
        }

        // visibility
        if ( repositorySettings.visibility !== null && repositorySettings.visibility !== currentData.visibility ) {
            data ??= {};
            data.visibility = repositorySettings.visibility;
        }

        // issues
        if ( repositorySettings.hasIssues !== null && repositorySettings.hasIssues !== currentData.has_issues ) {
            data ??= {};
            data.has_issues = repositorySettings.hasIssues;
        }

        // projects
        if ( repositorySettings.hasProjects !== null && repositorySettings.hasProjects !== currentData.has_projects ) {
            data ??= {};
            data.has_projects = repositorySettings.hasProjects;
        }

        // wiki
        if ( repositorySettings.hasWiki !== null && repositorySettings.hasWiki !== currentData.has_wiki ) {
            data ??= {};
            data.has_wiki = repositorySettings.hasWiki;
        }

        // discussions
        if ( repositorySettings.hasDiscussions !== null && repositorySettings.hasDiscussions !== currentData.has_discussions ) {
            data ??= {};
            data.has_discussions = repositorySettings.hasDiscussions;
        }

        // default branch
        if ( repositorySettings.defaultBranch !== null && repositorySettings.defaultBranch !== currentData.default_branch ) {
            data ??= {};
            data.default_branch = repositorySettings.defaultBranch;
        }

        // allow forking
        if ( repositorySettings.allowForking !== null && repositorySettings.allowForking !== currentData.allow_forking ) {
            data ??= {};
            data.allow_forking = repositorySettings.allowForking;
        }

        // web commit signoff required
        if ( repositorySettings.webCommitSignoffRequired !== null && repositorySettings.webCommitSignoffRequired !== currentData.web_commit_signoff_required ) {
            data ??= {};
            data.web_commit_signoff_required = repositorySettings.webCommitSignoffRequired;
        }

        // security and analysis
        if ( currentData.security_and_analysis ) {

            // secret scanning
            if ( repositorySettings.secretScanning !== null && repositorySettings.secretScanning !== currentData.security_and_analysis.secret_scanning.status ) {
                data ??= {};
                data.security_and_analysis ??= {};
                data.security_and_analysis.secret_scanning = {
                    "status": repositorySettings.secretScanning,
                };
            }

            // secret scanning push protection
            if ( repositorySettings.secretScanningPushProtection !== null && repositorySettings.secretScanningPushProtection !== currentData.security_and_analysis.secret_scanning_push_protection.status ) {
                data ??= {};
                data.security_and_analysis ??= {};
                data.security_and_analysis.secret_scanning_push_protection = {
                    "status": repositorySettings.secretScanningPushProtection,
                };
            }
        }

        if ( data ) {
            updated = true;

            res = await gitHubApi.updateRepository( upstream.repositorySlug, data );
            if ( !res.ok ) return res;
        }

        // vulnerability alerts
        if ( repositorySettings.vulnerabilityAlerts != null ) {
            res = await gitHubApi.getVulnerabilityAlertsEnabled( upstream.repositorySlug );
            if ( !res.ok ) return res;

            if ( repositorySettings.vulnerabilityAlerts !== res.data.enabled ) {
                res = await gitHubApi.setVulnerabilityAlertsEnabled( upstream.repositorySlug, repositorySettings.vulnerabilityAlerts );
                if ( !res.ok ) return res;

                updated = true;
            }
        }

        // dependabot Security Updates
        if ( repositorySettings.dependabotsecurityupdates != null ) {
            res = await gitHubApi.getDependabotsecurityupdatesEnabled( upstream.repositorySlug );
            if ( !res.ok ) return res;

            if ( repositorySettings.dependabotsecurityupdates !== res.data.enabled ) {
                res = await gitHubApi.setDependabotsecurityupdateEnabled( upstream.repositorySlug, repositorySettings.dependabotsecurityupdates );
                if ( !res.ok ) return res;

                updated = true;
            }
        }

        // private vulnerability reporting
        if ( repositorySettings.privateVulnerabilityReporting != null && !currentData.private ) {
            res = await gitHubApi.getPrivateVulnerabilityReportingEnabled( upstream.repositorySlug );
            if ( !res.ok ) return res;

            if ( repositorySettings.privateVulnerabilityReporting !== res.data.enabled ) {
                res = await gitHubApi.setPrivateVulnerabilityReportingEnabled( upstream.repositorySlug, repositorySettings.privateVulnerabilityReporting );
                if ( !res.ok ) return res;

                updated = true;
            }
        }

        return result( 200, {
            updated,
        } );
    }

    // private
    #clearCache () {
        this.#config = undefined;
        this.#cliConfig = undefined;
        this.#version = undefined;
        this.#workspaces = undefined;
        this.#subPackages = undefined;
        this.#dependencies = undefined;
    }

    async #updateMetadata ( { dependabot, commit } = {} ) {
        var res, updated;

        // get git status
        res = await this.git.getWorkingTreeStatus();
        if ( !res.ok ) return res;

        // package is dirty
        if ( res.data.isDirty ) return result( [ 500, "Package has uncommited changes" ] );

        const upstream = this.git.upstream,
            packages = [ this, ...this.subPackages ],
            fileTree = new FileTree();

        for ( const pkg of packages ) {
            const config = await readConfig( pkg.root + "/package.json" );

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

            // homepage
            if ( pkg.cliConfig ) {
                config.homepage = pkg.cliConfig.meta.homepage || ( this.docs.isEnabled && upstream.docsUrl ) || upstream.homeUrl;
            }
            else {
                config.homepage ||= upstream.homeUrl;
            }

            // license
            if ( pkg.cliConfig ) {
                config.license = pkg.cliConfig.meta.license || config.private
                    ? process.env.META_LICENSE_PRIVATE
                    : process.env.META_LICENSE_PUBLIC;
            }

            // author
            if ( pkg.cliConfig ) {
                config.author = pkg.cliConfig.meta.author || process.env.META_AUTHOR;
            }

            // scripts
            if ( pkg.cliConfig ) {

                // "test" script
                if ( ( await glob( "tests/**/*.test.js", { "cwd": pkg.root } ) ).length ) {
                    config.scripts ??= {};
                    config.scripts.test = "node --test tests/**/*.test.js";
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

        // lint
        for ( const file of fileTree ) {
            const res = await lintFile( new File( {
                "path": path.join( this.root, file.path ),
                "buffer": await file.text(),
            } ) );

            if ( !res.ok ) return res;

            fileTree.add( new File( {
                "path": file.path,
                "buffer": res.data,
            } ) );
        }

        // write file tree
        await fileTree.write( this.root );

        // get git status
        res = await this.git.getWorkingTreeStatus();
        if ( !res.ok ) return res;

        updated = res.data.isDirty;

        if ( updated ) {

            // commit and push
            if ( commit ) {

                // add changes
                res = await this.git.exec( [ "add", "." ] );
                if ( !res.ok ) return res;

                // commit changes
                res = await this.git.exec( [ "commit", "-m", "chore(metadata): update package metadata" ] );
                if ( !res.ok ) return res;

                // push
                res = await this.git.exec( [ "push" ] );
                if ( !res.ok ) return res;
            }
        }

        return result( 200, {
            updated,
        } );
    }

    async #updateDependabotConfig () {
        const upstream = this.git.upstream;

        if ( !upstream.isGitHub ) return result( 200 );

        var filename,
            config,
            updates = new Map();

        if ( await exists( this.root + "/.github/dependabot.yaml" ) ) {
            filename = "dependabot.yaml";

            config = await readConfig( this.root + "/.github/dependabot.yaml" );
        }
        else if ( await exists( this.root + "/.github/dependabot.yml" ) ) {
            filename = "dependabot.yml";

            config = await readConfig( this.root + "/.github/dependabot.yml" );
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
        if ( this.cliConfig?.meta.dependabot.npm?.interval ) {
            const directories = [];

            for ( const pkg of [ this, ...this.subPackages ] ) {
                if ( pkg.cliConfig?.meta.dependabot.npm ) {
                    if ( pkg.config.dependencies || pkg.config.devDependencies || pkg.config.peerDependencies ) {
                        directories.push( "/" + ( pkg.rootSlug || "" ) );
                    }
                }
            }

            if ( directories.length ) {
                updates.set( "npm", {
                    "package-ecosystem": "npm",
                    "directories": directories.sort(),
                    "schedule": {
                        "interval": this.cliConfig.meta.dependabot.npm.interval,
                        "day": this.cliConfig.meta.dependabot.npm.day.toLowerCase(),
                        "time": new Locale().formatDate( Temporal.PlainTime.from( this.cliConfig.meta.dependabot.npm.time ), "timeStyle:short" ),
                        "timezone": this.cliConfig.meta.dependabot.npm.timezone,
                    },
                    "open-pull-requests-limit": this.cliConfig.meta.dependabot.npm[ "open-pull-requests-limit" ],
                } );
            }
        }

        // docker
        if ( this.cliConfig?.meta.dependabot.docker?.interval && this.hasDockerfile ) {
            updates.set( "docker", {
                "package-ecosystem": "docker",
                "directories": [ "/" ],
                "schedule": {
                    "interval": this.cliConfig.meta.dependabot.docker.interval,
                    "day": this.cliConfig.meta.dependabot.docker.day.toLowerCase(),
                    "time": new Locale().formatDate( Temporal.PlainTime.from( this.cliConfig.meta.dependabot.docker.time ), "timeStyle:short" ),
                    "timezone": this.cliConfig.meta.dependabot.docker.timezone,
                },
                "open-pull-requests-limit": this.cliConfig.meta.dependabot.docker[ "open-pull-requests-limit" ],
            } );
        }

        // github-actions
        if ( this.cliConfig?.meta.dependabot[ "github-actions" ]?.interval && ( await glob( ".github/workflows/*.*", { "cwd": this.root } ) ).length ) {
            updates.set( "github-actions", {
                "package-ecosystem": "github-actions",
                "directories": [ "/" ],
                "schedule": {
                    "interval": this.cliConfig.meta.dependabot[ "github-actions" ].interval,
                    "day": this.cliConfig.meta.dependabot[ "github-actions" ].day.toLowerCase(),
                    "time": new Locale().formatDate( Temporal.PlainTime.from( this.cliConfig.meta.dependabot[ "github-actions" ].time ), "timeStyle:short" ),
                    "timezone": this.cliConfig.meta.dependabot[ "github-actions" ].timezone,
                },
                "open-pull-requests-limit": this.cliConfig.meta.dependabot[ "github-actions" ][ "open-pull-requests-limit" ],
            } );
        }

        if ( !updates.size ) {
            if ( await exists( this.root + "/.github" ) ) {
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

    async #getLinkedDependencies () {
        const dependencies = new Map();

        await Promise.all( [
            ...new Set( [
                ...this.dependencies.keys(),
                ...( await glob( [ "*", "@*/*" ], {
                    "cwd": this.root + "/node_modules",
                    "files": false,
                    "directories": true,
                } ) ),
            ] ),
        ].map( name => {
            const location = path.join( this.root, "node_modules", name );

            return fs.promises
                .readlink( location )
                .then( link =>
                    dependencies.set( name, {
                        name,
                        location,
                        link,
                    } ) )
                .catch( e => {

                    // not exists
                    if ( e.code === "ENOENT" ) {
                        dependencies.set( name, {
                            name,
                            location,
                            "link": null,
                        } );
                    }

                    // other error
                    else if ( e.code !== "EINVAL" ) {
                        console.log( e );
                    }
                } );
        } ) );

        return dependencies;
    }
}
