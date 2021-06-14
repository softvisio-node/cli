import fs from "#core/fs";
import _path from "path";
import glob from "glob";
import { confirm } from "#core/utils";
import child_process from "child_process";
import Semver from "./semver.js";
import Git from "./git.js";
import Wiki from "./package/wiki.js";
import Docs from "./package/docs.js";
import { ansi } from "#core/text";
import url from "url";

export default class Package {
    #root;
    #parent;
    #isPackage;
    #isRootPackage;
    #config;
    #docsConfig;
    #workspaces;
    #packages;
    #git;
    #wiki;
    #docs;

    // static
    static isPackageDir ( dir ) {
        return fs.existsSync( dir + "/package.json" );
    }

    static isRootPackageDir ( dir ) {
        return fs.existsSync( dir + "/package.json" ) && fs.existsSync( dir + "/.git" );
    }

    static findRootPackage ( path ) {
        var root = _path.normalize( _path.resolve( path || process.cwd() ) );

        while ( 1 ) {
            if ( this.isRootPackageDir( root ) ) return new this( root.replaceAll( "\\", "/" ) );

            if ( _path.dirname( root ) === root ) break;

            root = _path.dirname( root );
        }
    }

    static findNearestPackage ( path ) {
        var root = _path.normalize( _path.resolve( path || process.cwd() ) );

        while ( 1 ) {
            if ( this.isPackageDir( root ) ) return new this( root.replaceAll( "\\", "/" ) );

            if ( _path.dirname( root ) === root ) break;

            root = _path.dirname( root );
        }
    }

    // constructor
    constructor ( root, options = {} ) {
        this.#root = root;

        this.#parent = options.parent;
    }

    // props
    get root () {
        return this.#root;
    }

    get parent () {
        return this.#parent;
    }

    get isPackage () {
        if ( this.#isPackage == null ) this.#isPackage = this.constructor.isPackageDir( this.root );

        return this.#isPackage;
    }

    get isRootPackage () {
        if ( this.#isRootPackage == null ) this.#isRootPackage = this.constructor.isRootPackageDir( this.root );

        return this.#isRootPackage;
    }

    get git () {
        if ( !this.#git ) {
            this.#git = new Git( this.root );
        }

        return this.#git;
    }

    get config () {
        if ( !this.#config ) this.#config = fs.config.read( this.root + "/package.json" );

        return this.#config;
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

    get relativePath () {
        if ( !this.#parent ) return "";

        return _path.relative( this.parent.root, this.root );
    }

    get workspaces () {
        if ( this.#workspaces == null ) {
            this.#workspaces = [];

            const workspaces = this.config.workspaces;

            if ( workspaces ) {
                for ( const pattern of workspaces ) {
                    if ( glob.hasMagic( pattern ) ) {
                        for ( const workspace of glob.sync( pattern + "/", {
                            "dot": true,
                            "cwd": this.#root,
                            "ignore": ["**/.git/**", "**/node_modules/**"],
                        } ) ) {
                            const root = this.#root + "/" + workspace;

                            if ( this.constructor.isPackageDir( root ) ) this.#workspaces.push( new this.constructor( root, { "parent": this } ) );
                        }
                    }
                    else {
                        const root = this.#root + "/" + pattern;

                        if ( this.constructor.isPackageDir( root ) ) this.#workspaces.push( new this.constructor( root, { "parent": this } ) );
                    }
                }
            }
        }

        return this.#workspaces;
    }

    get packages () {
        if ( !this.#packages ) {
            this.#packages = [];

            const packages = this.config.packages;

            if ( packages ) {
                for ( const pattern of packages ) {
                    if ( glob.hasMagic( pattern ) ) {
                        for ( const pkg of glob.sync( pattern + "/", {
                            "dot": true,
                            "cwd": this.#root,
                            "ignore": ["**/.git/**", "**/node_modules/**"],
                        } ) ) {
                            const root = this.#root + "/" + pkg;

                            if ( this.constructor.isPackageDir( root ) ) this.#packages.push( new this.constructor( root, { "parent": this } ) );
                        }
                    }
                    else {
                        const root = this.#root + "/" + pattern;

                        if ( this.constructor.isPackageDir( root ) ) this.#packages.push( new this.constructor( root, { "parent": this } ) );
                    }
                }
            }
        }

        return this.#packages;
    }

    get docsConfig () {
        if ( this.#docsConfig === undefined ) {
            if ( fs.existsSync( this.root + "/docs/.docs.config.yaml" ) ) {
                this.#docsConfig = fs.config.read( this.root + "/docs/.docs.config.yaml" );

                this.#docsConfig.location = "docs";
            }
            else if ( fs.existsSync( this.root + "/.docs.config.yaml" ) ) {
                this.#docsConfig = fs.config.read( this.root + "/.docs.config.yaml" );

                this.#docsConfig.location = "root";
            }
            else {
                this.#docsConfig = null;
            }
        }

        return this.#docsConfig;
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

    get npmURL () {
        if ( this.isPrivate || !this.name ) return null;

        return `https://www.npmjs.com/package/${this.name}`;
    }

    // public
    patchVersion ( version ) {
        const root = this.root;

        // update package.json
        const pkg = fs.config.read( root + "/package.json" );
        pkg.version = version;
        fs.config.write( root + "/package.json", pkg, { "readable": true } );

        // update npm-shrinkwrap.json
        if ( fs.existsSync( root + "/npm-shrinkwrap.json" ) ) {
            const data = fs.config.read( root + "/npm-shrinkwrap.json" );
            data.version = version;
            if ( data.packages && data.packages[""] ) data.packages[""].version = version;
            fs.config.write( root + "/npm-shrinkwrap.json", data, { "readable": true } );
        }

        // update package-lock.json
        if ( fs.existsSync( root + "/package-lock.json" ) ) {
            const data = fs.config.read( root + "/package-lock.json" );
            data.version = version;
            if ( data.packages && data.packages[""] ) data.packages[""].version = version;
            fs.config.write( root + "/package-lock.json", data, { "readable": true } );
        }

        // update cordova config.xml
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

    async publishNPM ( tag, latest ) {
        if ( this.isPrivate ) return;

        this.#clearCache();

        while ( 1 ) {
            try {
                child_process.spawnSync( "npm", ["publish", "--tag", tag, "--access", "public", this.root], { "shell": true, "stdio": "inherit" } );
            }
            catch ( e ) {
                console.log( `Unable to publish to the npm registry.` );

                if ( ( await confirm( "Repeat?", ["y", "n"] ) ) === "n" ) break;
            }

            break;
        }

        if ( !latest ) return;

        while ( 1 ) {
            try {
                child_process.spawnSync( "npm", ["dist-tag", "add", this.name + "@" + this.version, "latest"], { "shell": true, "stdio": "inherit" } );
            }
            catch ( e ) {
                console.log( `Unable to set "latest" tag.` );

                if ( ( await confirm( "Repeat?", ["y", "n"] ) ) === "n" ) break;
            }

            break;
        }
    }

    hasPreReleaseDepth () {
        const config = this.config;

        for ( const name of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] ) {
            if ( !config[name] ) continue;

            for ( const dependencyName in config[name] ) {
                let dependencyRange = config[name][dependencyName];

                const match = dependencyRange.match( /#semver:(.+)$/ );

                if ( match ) dependencyRange = match[1];

                dependencyRange = new Semver.Range( dependencyRange );

                try {
                    if ( dependencyRange.isPreRelease ) return result( [500, `Package "${this.name}" has pre-release dependency "${dependencyName}@${config[name][dependencyName]}"`] );
                }
                catch ( e ) {
                    return result( [500, `Unable to parse dependency version "${dependencyName + "@" + config[name][dependencyName]}"`] );
                }
            }
        }

        return result( 200 );
    }

    async publish ( releaseType, preReleaseTag ) {
        const { "default": Publish } = await import( "./package/publish.js" );

        const publish = new Publish( this, releaseType, preReleaseTag );

        return publish.run();
    }

    async test ( options = {} ) {
        if ( !fs.existsSync( this.root + "/__tests__" ) ) {
            console.log( `Tests for package "${this.name}": ${ansi.warn( " NOT FOUND " )}` );

            return result( 200 );
        }

        const { runner } = await import( "#core/tests" );

        await runner.loadModules( url.pathToFileURL( this.root + "/__tests__" ) );

        const res = await runner.run( options );

        if ( res.ok ) {
            console.log( `Tests for package "${this.name}": ${ansi.ok( " PASS " )}` );
        }
        else {
            console.log( `Tests for package "${this.name}": ${ansi.error( " FAIL " )}` );
        }

        return res;
    }

    async testPlan ( options = {} ) {
        if ( !fs.existsSync( this.root + "/__tests__" ) ) {
            if ( !options.json ) console.log( `Tests plan for package "${this.name}": ${ansi.warn( " NOT FOUND " )}` );

            return;
        }

        const { runner } = await import( "#core/tests" );

        await runner.loadModules( url.pathToFileURL( this.root + "/__tests__" ) );

        if ( !options.json ) console.log( `Tests plan for package "${this.name}"` );

        return runner.plan( options, true );
    }

    // private
    #clearCache () {
        this.#config = null;
    }
}
