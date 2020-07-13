const child_process = require( "child_process" );
const result = require( "@softvisio/core/result" );
const CondVar = require( "@softvisio/core/threads/condvar" );
const CONST = require( "./const" );

const versionRe = new RegExp( `^${CONST.VERSION_PREFIX}\\d+[.]\\d+[.]\\d+$` );

module.exports = class Git {
    #root;

    constructor ( root ) {
        this.#root = root;
    }

    async run ( ...args ) {
        if ( this.#root ) args.unshift( "-C", this.#root );

        return new Promise( resolve => {
            child_process.execFile( "git", args, { "encoding": "utf8", "stdio": ["pipe", "pipe", "pipe"] }, ( err, stdout, stderr ) => {
                if ( err ) {
                    resolve( result( [500, err.message] ) );
                }
                else {
                    resolve( result( 200, stdout ) );
                }
            } );
        } );
    }

    async getUpstream ( url ) {
        var Upstream = require( "./git/upstream" );

        if ( url ) {
            return new Upstream( url );
        }
        else {
            const res = await this.run( "ls-remote", "--get-url" );

            if ( !res.ok || !res.data ) return;

            return new Upstream( res.data.trim() );
        }
    }

    async getLog ( tag ) {
        const args = ["log", "--pretty=format:%s"];

        if ( tag ) args.push( tag + "..HEAD" );

        const res = await this.run( ...args );

        if ( !res.ok ) return res;

        if ( !res.data ) return res;

        const idx = {},
            data = [];

        for ( const line of res.data.split( "\n" ) ) {
            if ( idx[line] == null ) {
                idx[line] = true;

                data.push( line );
            }
        }

        return result( 200, data );
    }

    async getId () {
        const id = {
            "branch": null,
            "date": null,
            "hash": null,
            "hashShort": null,
            "isDirty": null,
            "release": null,
            "releaseDistance": null,
            "tags": [],
        };

        let hasError;

        const cv = new CondVar().begin();

        // get changeset id
        cv.begin();
        this.run( "log", "-1", "--pretty=format:%H%n%cI%n%D" ).then( res => {
            if ( !res.ok ) {
                hasError = true;
            }
            else {
                let ref;

                [id.hash, id.date, ref] = res.data.split( "\n" );

                id.hashShort = id.hash.substr( 0, 8 );

                ref = ref.split( "," );

                // parse current branch
                const branch = ref.shift().match( /->\s(.+)/ );
                if ( branch ) id.branch = branch[1];

                // parse tags
                for ( const token of ref ) {
                    const tag = token.match( /tag:\s(.+)/ );
                    if ( tag ) id.tags.push( tag[1] );
                }
            }

            cv.end();
        } );

        // get release and release distance
        cv.begin();
        this.run( "describe", "--tags", "--always", "--match", CONST.VERSION_PREFIX + "[0-9]*.[0-9]*.[0-9]*" ).then( res => {
            if ( !res.ok ) {
                hasError = true;
            }
            else {

                // remove trailing "\n"
                res.data = res.data.trim();

                const data = res.data.split( "-" );

                const release = data[0].match( versionRe );

                if ( release ) {
                    id.release = data[0];

                    id.releaseDistance = data[1] == null ? 0 : +data[1];
                }
            }

            cv.end();
        } );

        // get dirty status
        cv.begin();
        this.run( "status", "--porcelain" ).then( res => {
            if ( !res.ok ) {
                hasError = true;
            }
            else {
                id.isDirty = !!res.data;
            }

            cv.end();
        } );

        return cv.end().recv( () => {
            if ( hasError ) {
                return result( 500 );
            }
            else {
                return result( 200, id );
            }
        } );
    }

    /** method: getPushStatus
     * summary: Returns number of unpushed changesets for each branch.
     */
    async getPushStatus () {
        return new Promise( resolve => {
            this.run( "branch", "-v", "--no-color" ).then( res => {
                if ( !res.ok || !res.data ) {
                    resolve( res );
                }
                else {
                    const branches = {};

                    for ( const br of res.data.split( /\n/ ) ) {
                        if ( !br ) continue;

                        const match = br.match( /^[*]?\s+(.+?)\s+(?:.+?)\s+(?:\[ahead\s(\d+)\])?/ );

                        if ( match ) {
                            branches[match[1]] = match[2] || 0;
                        }
                        else {
                            throw Error`Unable to parse git output: ${br}`;
                        }
                    }

                    resolve( result( 200, branches ) );
                }
            } );
        } );
    }

    async getReleases () {
        return new Promise( resolve => {
            this.run( "tag" ).then( res => {
                if ( !res.ok ) {
                    resolve( res );
                }
                else {
                    var tags = Object.fromEntries( res.data
                        .split( /\n/ )
                        .filter( tag => tag.match( versionRe ) )
                        .sort( ( a, b ) => {
                            a = a.replace( CONST.VERSION_PREFIX, "" ).split( "." );
                            b = b.replace( CONST.VERSION_PREFIX, "" ).split( "." );

                            return b[0] - a[0] || b[1] - a[1] || b[2] - a[2];
                        } )
                        .map( tag => [tag, true] ) );

                    resolve( result( 200, tags ) );
                }
            } );
        } );
    }

    async createObject ( data ) {
        const args = ["hash-object", "-w", "--stdin"];

        if ( this.#root ) args.unshift( "-C", this.#root );

        return new Promise( resolve => {
            const child = child_process.spawn( "git", args, { "encoding": "utf8", "stdio": "pipe" } );

            let hash = "";

            child.stdout.on( "data", data => {
                hash += data;
            } );

            child.on( "error", e => {
                resolve( result( [500, e.message] ) );
            } );

            child.on( "exit", () => {
                resolve( result( 200, hash.trim() ) );
            } );

            child.stdin.write( data );

            child.stdin.end();
        } );
    }
};
