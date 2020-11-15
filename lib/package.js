const fs = require( "fs" );
const _path = require( "path" );
const glob = require( "glob" );
const { confirm } = require( "@softvisio/core/util" );
const child_process = require( "child_process" );

class Package {
    #root;
    #parent;
    #isPackage;
    #isRootPackage;
    #config;
    #workspaces;
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
            fs.writeFileSync( root + "/npm-shrinkwrap.json", JSON.stringify( data, null, 4 ) + "\n" );
        }

        // update package-lock.json
        if ( fs.existsSync( root + "/package-lock.json" ) ) {
            const data = require( root + "/package-lock.json" );
            data.version = version;
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

    async publish () {
        if ( this.isProvate ) return;

        while ( 1 ) {
            try {
                child_process.spawnSync( "npm", ["publish", "--access", "public", this.root], { "shell": true, "stdio": "inherit" } );
            }
            catch ( e ) {
                console.log( `Unable to publish to the npm registry.` );

                if ( ( await confirm( "Repeat?", ["y", "n"] ) ) === "n" ) break;
            }

            break;
        }
    }
}

module.exports = Package;
