import child_process from "child_process";
import CondVar from "#core/threads/condvar";
import Semver from "./semver.js";
import Upstream from "./git/upstream.js";

export default class Git {
    #root;

    constructor ( root ) {
        this.#root = root;
    }

    // static
    static get Upstream () {
        return Upstream;
    }

    // public
    async run ( ...args ) {
        if ( this.#root ) args.unshift( "-C", this.#root );

        return new Promise( resolve => {
            child_process.execFile( "git", args, { "encoding": "utf8", "stdio": ["pipe", "pipe", "pipe"], "maxBuffer": 1024 * 1024 * 10 }, ( err, stdout, stderr ) => {
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
        if ( tag instanceof Semver ) {
            if ( tag.isNull ) tag = null;
            else tag = tag.toVersionString();
        }

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
            "currentVersion": new Semver(),
            "currentVersionDistance": null,
            "tags": [],
            "pushStatus": {},
            "versions": {},
            "lastVersion": new Semver(),
        };

        let hasError;

        const cv = new CondVar().begin();

        // get changeset id
        cv.begin();
        this.run( "log", "-1", "--pretty=format:%H%n%cI%n%D" ).then( res => {
            if ( !res.ok ) {
                if ( res.statusText.indexOf( "does not have any commits yet" ) === -1 ) {
                    hasError = true;
                }
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
        this.run( "describe", "--tags", "--always", "--match", "v[[:digit:]]*" ).then( res => {
            if ( !res.ok ) {
                if ( res.statusText.indexOf( "Not a valid object name HEAD" ) === -1 ) {
                    hasError = true;
                }

                cv.end();
            }
            else {

                // remove trailing "\n"
                res.data = res.data.trim();

                const match = res.data.match( /^(.*?)-(\d+)-(g[a-f0-9]+)$/ );

                if ( match && Semver.isValid( match[1] ) ) {
                    id.currentVersion = new Semver( match[1] );

                    id.currentVersionDistance = +match[2];

                    cv.end();
                }
                else if ( Semver.isValid( res.data ) ) {
                    id.currentVersion = new Semver( res.data );

                    id.currentVersionDistance = 0;

                    cv.end();
                }

                // release distance from the previous version tag wasn't found
                else {

                    // get total number of commits
                    this.run( "rev-list", "HEAD", "--count" ).then( res => {
                        if ( !res.ok ) {
                            hasError = true;
                        }
                        else {
                            id.currentVersionDistance = +res.data.trim();
                        }

                        cv.end();
                    } );
                }
            }
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

        // get push status
        cv.begin();
        this.run( "branch", "-v", "--no-color" ).then( res => {
            if ( !res.ok ) {
                hasError = true;
            }
            else {
                for ( const line of res.data.split( /\n/ ) ) {
                    if ( !line ) continue;

                    const match = line.match( /^[*]?\s+(.+?)\s+(?:.+?)\s+(?:\[ahead\s(\d+)\])?/ );

                    if ( match ) {
                        id.pushStatus[match[1]] = match[2] || 0;
                    }
                    else {
                        throw Error`Unable to parse git output: ${line}`;
                    }
                }
            }

            cv.end();
        } );

        // get versions
        cv.begin();
        this.run( "tag" ).then( res => {
            if ( !res.ok ) {
                hasError = true;
            }
            else {
                var tags = res.data
                    .split( /\n/ )
                    .filter( tag => Semver.isValid( tag ) )
                    .sort( ( a, b ) => Semver.compare( b, a ) )
                    .map( tag => new Semver( tag ) );

                if ( tags.length ) {
                    id.lastVersion = tags[0];

                    id.versions = Object.fromEntries( tags.map( tag => [tag, tag] ) );
                }
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
}
