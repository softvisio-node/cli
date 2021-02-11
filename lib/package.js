const fs = require( "fs" );
const _path = require( "path" );
const glob = require( "glob" );
const { confirm } = require( "@softvisio/core/util" );
const child_process = require( "child_process" );
const semver = require( "semver" );

class Package {
    #root;
    #parent;
    #isPackage;
    #isRootPackage;
    #config;
    #workspaces;
    #packages;
    #git;
    #wiki;

    // STATIC
    static isPackageDir ( dir ) {
        return fs.existsSync( dir + "/package.json" );
    }

    static isRootPackageDir ( dir ) {
        return fs.existsSync( dir + "/package.json" ) && fs.existsSync( dir + "/.git" );
    }

    static findRootPackage ( path ) {
        var root = _path.normalize( _path.resolve( path || process.cwd() ) );

        while ( 1 ) {
            if ( this.isRootPackageDir( root ) ) return new this( root.replace( /\\/g, "/" ) );

            if ( _path.dirname( root ) === root ) break;

            root = _path.dirname( root );
        }
    }

    static findNearestPackage ( path ) {
        var root = _path.normalize( _path.resolve( path || process.cwd() ) );

        while ( 1 ) {
            if ( this.isPackageDir( root ) ) return new this( root.replace( /\\/g, "/" ) );

            if ( _path.dirname( root ) === root ) break;

            root = _path.dirname( root );
        }
    }

    // CONSTRUCTOR
    constructor ( root, options = {} ) {
        this.#root = root;

        this.#parent = options.parent;
    }

    // PROPS
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
            const Git = require( "./git" );

            this.#git = new Git( this.root );
        }

        return this.#git;
    }

    get config () {
        if ( !this.#config ) this.#config = require( this.root + "/package.json" );

        return this.#config;
    }

    get name () {
        return this.config.name;
    }

    get version () {
        return this.config.version;
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
        if ( this.#packages == null ) {
            this.#packages = [];

            const packages = this.config["packages"];

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

    get wiki () {
        if ( !this.#wiki ) {
            const Wiki = require( "./package/wiki" );

            this.#wiki = new Wiki( this );
        }

        return this.#wiki;
    }

    // PUBLIC
    patchVersion ( version ) {
        const root = this.root;

        // update package.json
        const pkg = require( root + "/package.json" );
        pkg.version = version;
        fs.writeFileSync( root + "/package.json", JSON.stringify( pkg, null, 4 ) + "\n" );

        // update npm-shrinkwrap.json
        if ( fs.existsSync( root + "/npm-shrinkwrap.json" ) ) {
            const data = require( root + "/npm-shrinkwrap.json" );
            data.version = version;
            if ( data.packages && data.packages[""] ) data.packages[""].version = version;
            fs.writeFileSync( root + "/npm-shrinkwrap.json", JSON.stringify( data, null, 4 ) + "\n" );
        }

        // update package-lock.json
        if ( fs.existsSync( root + "/package-lock.json" ) ) {
            const data = require( root + "/package-lock.json" );
            data.version = version;
            if ( data.packages && data.packages[""] ) data.packages[""].version = version;
            fs.writeFileSync( root + "/package-lock.json", JSON.stringify( data, null, 4 ) + "\n" );
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

    #clearCache () {
        this.#config = null;
    }

    async publish ( tag, latest ) {
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
                let dependencyVersion = config[name][dependencyName];

                const match = dependencyVersion.match( /#semver:(.+)$/ );

                if ( match ) dependencyVersion = match[1];

                try {
                    if ( semver.minVersion( dependencyVersion ).prerelease.length ) return result( [500, `Package "${this.name}" has pre-release dependency "${dependencyName}${config[name][dependencyName]}"`] );
                }
                catch ( e ) {
                    return result( [500, `Unable to parse dependency version "${dependencyName + "@" + config[name][dependencyName]}"`] );
                }
            }
        }

        return result( 200 );
    }
}

module.exports = Package;
