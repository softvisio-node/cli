import "#core/result";
import SemanticVersionRange from "#core/semantic-version/range";

const TAGS = new Set( [ "latest", "next" ] ),
    DEPENDENCIES = {
        "dependencies": {
            "dev": false,
            "peer": false,
        },
        "devDependencies": {
            "dev": true,
            "peer": false,
        },
        "peerDependencies": {
            "dev": false,
            "peer": true,
        },
        "optionalDependencies": {
            "dev": false,
            "peer": false,
        },
    };

export default class PackageDependencies {
    #config;
    #names = new Set();
    #peerNames = new Set();
    #preReleaseNames = new Set();
    #dependencies = [];

    constructor ( config ) {
        this.#config = config;

        this.#parse();
    }

    // properties
    get config () {
        return this.#config;
    }

    get hasDependencies () {
        return Boolean( this.#names.size );
    }

    get names () {
        return this.#names;
    }

    get peerNames () {
        return this.#peerNames;
    }

    get preReleaseNames () {
        return this.#preReleaseNames;
    }

    // public
    has ( name ) {
        return this.#names.has( name );
    }

    fix () {
        const json = JSON.stringify( this.config );

        for ( const dependency of this.#dependencies ) {
            if ( !this.config[ dependency.type ]?.[ dependency.name ] ) continue;

            if ( !dependency.range ) continue;

            if ( dependency.versionType === "git" ) {
                this.config[ dependency.type ][ dependency.name ] = this.config[ dependency.type ][ dependency.name ].replace( /#semver:(.+)$/, "#semver:" + dependency.range.range );
            }
            else {
                this.config[ dependency.type ][ dependency.name ] = dependency.range.range;
            }
        }

        return result( 200, {
            "updated": json !== JSON.stringify( this.config ),
            "config": this.config,
        } );
    }

    [ Symbol.iterator ] () {
        return this.#dependencies.values();
    }

    // private
    #parse () {
        for ( const type in DEPENDENCIES ) {
            if ( !this.config[ type ] ) continue;

            for ( const [ name, version ] of Object.entries( this.config[ type ] ) ) {
                this.#names.add( name );

                const data = {
                    name,
                    version,
                    type,
                    "isDevelopment": DEPENDENCIES[ type ].dev,
                    "isPeer": DEPENDENCIES[ type ].peer,
                    "versionType": null, // file, tarball, git, version
                    "range": null,
                    "isPreRelease": null,
                    "gitRepositorySlug": null,
                };

                if ( data.isPeer ) this.#peerNames.add( name );

                const parsedVersion = this.#parseVersion( version );
                data.versionType = parsedVersion.versionType;
                data.range = parsedVersion.range;
                data.isPreRelease = parsedVersion.isPreRelease;
                data.gitRepositorySlug = parsedVersion.gitRepositorySlug;

                if ( data.isPreRelease ) this.#preReleaseNames.add( data.name );

                this.#dependencies.push( data );
            }
        }
    }

    #parseVersion ( version ) {
        const data = {
            "versionType": null,
            "range": null,
            "isPreRelease": false,
            "gitRepositorySlug": null,
        };

        var range;

        if ( !version ) {
            range = "*";
        }

        // tag
        else if ( TAGS.has( version ) ) {
            data.versionType = "tag";
        }

        // file: url
        else if ( version.startsWith( "file:" ) ) {
            data.versionType = "file";
        }

        // "/"
        else if ( version.includes( "/" ) ) {

            // file path
            if ( version.startsWith( "/" ) || version.startsWith( "./" ) || version.startsWith( "../" ) || version.startsWith( "~/" ) ) {
                data.versionType = "file";
            }

            // url
            else {
                try {
                    const url = new URL( version, "git+ssh://git@github.com/" );

                    // git url
                    if ( url.protocol.startsWith( "git" ) ) {
                        data.versionType = "git";

                        data.gitRepositorySlug = url.pathname;

                        // parse #semver=
                        const match = url.hash.match( /#semver:(.+)$/ );

                        if ( match ) {
                            range = match[ 1 ];
                        }
                    }
                    else {
                        data.versionType = "url";
                    }
                }
                catch {}
            }
        }
        else {
            range = version;
        }

        if ( range ) {
            try {
                data.range = new SemanticVersionRange( range );
            }
            catch {}
        }

        // detect pre-release
        if ( data.versionType === "tag" && version === "next" ) {
            data.isPreRelease = true;
        }
        else if ( data.range?.hasPreReleaseDependencies ) {
            data.isPreRelease = true;
        }

        return data;
    }
}
