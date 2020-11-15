const fs = require( "fs" );
const _path = require( "path" );
const Git = require( "./git" );
const glob = require( "glob" );

function isPackageDir ( root ) {
    return fs.existsSync( root + "/package.json" );
}

function isRootPackageDir ( root ) {
    return fs.existsSync( root + "/package.json" ) && fs.existsSync( root + "/.git" );
}

class Package {
    #root;
    #parent;
    #isPackage;
    #isRootPackage;
    #workspaces;

    // STATIC
    static findRootPackage ( path ) {
        var root = _path.normalize( _path.resolve( path || process.cwd() ) );

        while ( 1 ) {
            if ( isRootPackageDir( root ) ) return new this( root.replace( /\\/g, "/" ) );

            if ( _path.dirname( root ) === root ) break;

            root = _path.dirname( root );
        }
    }

    static findNearestPackage ( path ) {
        var root = _path.normalize( _path.resolve( path || process.cwd() ) );

        while ( 1 ) {
            if ( isPackageDir( root ) ) return new this( root.replace( /\\/g, "/" ) );

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
        if ( this.#isPackage == null ) this.#isPackage = isPackageDir( this.root );

        return this.#isPackage;
    }

    get isRootPackage () {
        if ( this.#isRootPackage == null ) this.#isRootPackage = isRootPackageDir( this.root );

        return this.#isRootPackage;
    }

    get git () {
        return new Git( this.root );
    }

    get config () {
        return require( this.root + "/package.json" );
    }

    get name () {
        return this.config.name;
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

                            if ( isPackageDir( root ) ) this.#workspaces.push( new this.constructor( root, { "parent": this } ) );
                        }
                    }
                    else {
                        const root = this.#root + "/" + pattern;

                        if ( isPackageDir( root ) ) this.#workspaces.push( new this.constructor( root, { "parent": this } ) );
                    }
                }
            }
        }

        return this.#workspaces;
    }

    // PUBLIC
    // XXX
    patchVersion ( version ) {}
}

module.exports = Package;
