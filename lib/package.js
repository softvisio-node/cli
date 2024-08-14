import fs from "node:fs";
import _path from "node:path";
import glob from "#core/glob";
import { confirm, mergeObjects } from "#core/utils";
import childProcess from "node:child_process";
import Semver from "#core/semver";
import Git from "./git.js";
import Wiki from "./package/wiki.js";
import Docs from "./package/docs.js";
import Localization from "./package/localization.js";
import { readConfig, writeConfig } from "#core/config";
import env from "#core/env";
import Ajv from "#core/ajv";

const validateCliConfig = new Ajv().compileFile( import.meta.resolve( "#resources/schemas/.cli.config.schema.yaml" ) ),
    defaultCliConfig = readConfig( "#resources/.cli.config.yaml", { "resolve": import.meta.url } );

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
    #monoRepositoryDirectory;

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

    // props
    get root () {
        return this.#root;
    }

    get rootPackage () {
        return this.#rootPackage;
    }

    get parentPackage () {
        return this.#parentPackage;
    }

    get monoRepositoryDirectory () {
        if ( this.#monoRepositoryDirectory === undefined ) {
            if ( this.rootPackage ) {
                this.#monoRepositoryDirectory = _path.posix.relative( this.rootPackage.root, this.root ).replaceAll( "\\", "/" );
            }
            else {
                this.#monoRepositoryDirectory = null;
            }
        }

        return this.#monoRepositoryDirectory;
    }

    get isPackage () {
        this.#isPackage ??= env.isPackageRoot( this.root );

        return this.#isPackage;
    }

    get isGitPackage () {
        this.#isGitPackage ??= env.isGitPackageRoot( this.root );

        return this.#isGitPackage;
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

            if ( fs.existsSync( this.root + "/.cli.config.yaml" ) ) {
                cliConfig = mergeObjects( {}, defaultCliConfig, readConfig( this.root + "/.cli.config.yaml" ) );
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
                        "rootPackage": this.isGitPackage ? this : this.rootPackage,
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
                        "rootPackage": this.isGitPackage ? this : this.rootPackage,
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
                catch ( e ) {
                    return result( [ 500, `Unable to parse dependency version "${ dependencyName }@ ${ version }"` ] );
                }
            }
        }

        return result( 200 );
    }

    async publish ( preRelease, force ) {
        const { "default": Publish } = await import( "./package/publish.js" );

        const publish = new Publish( this, preRelease, force );

        return publish.run();
    }

    async updateMetadata ( { force } = {} ) {
        env.loadUserEnv();

        const upstream = this.git.upstream,
            packages = [ this, ...this.subPackages ];

        for ( const pkg of packages ) {
            const config = readConfig( pkg.root + "/package.json" );

            // homepage
            if ( !config.homepage || force ) config.homepage = ( pkg.docs.isExists && upstream.docsUrl ) || upstream.homeUrl;

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

            if ( pkg.monoRepositoryDirectory ) {
                config.repository.directory = pkg.monoRepositoryDirectory;
            }
            else {
                delete config.repository.directory;
            }

            // license
            if ( !config.license || force ) config.license = config.private ? process.env.META_LICENSE_PRIVATE : process.env.META_LICENSE_PUBLIC;

            // author
            if ( !config.author || force ) config.author = process.env.META_AUTHOR;

            writeConfig( pkg.root + "/package.json", config, { "readable": true } );
        }
    }

    test () {
        const res = childProcess.spawnSync( "node", [ "--test" ], {
            "cwd": this.root + "/_tests",
            "stdio": "inherit",
        } );

        if ( res.status ) {
            return result( [ 500, "Tests failed" ] );
        }
        else {
            return result( 200 );
        }
    }

    // private
    #clearCache () {
        this.#config = null;
    }
}
