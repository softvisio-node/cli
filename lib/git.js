import _Git from "#core/api/git";
import childProcess from "child_process";
import CondVar from "#core/threads/condvar";
import Semver from "./semver.js";
import Releases from "#lib/git/releases";
import Changes from "#lib/git/changes";

const BRANCH_RE = /^(?<current>\*)? +(?:\((?<head>HEAD)[^)]+\)|(?<branch>[^ ]+)) +(?<hash>[a-z0-9]+)(?: \[ahead (?<ahead>\d+)\])? (?<description>.+)/;

export default class Git extends _Git {

    // public
    async getStatus () {
        const status = {

            // commit
            "hash": null,
            "abbrev": null,
            "date": null,
            "branch": null,
            "tags": [],
            "currentVersion": new Semver(),
            "currentVersionDistance": null,

            // state
            "isDirty": null,
            "pushStatus": {},
            "releases": null,
        };

        let hasError;

        const cv = new CondVar().begin();

        // get changeset id
        cv.begin();
        this.run( "log", "-1", "--pretty=format:%H%n%h%n%cI%n%D" ).then( res => {
            if ( !res.ok ) {
                if ( !res.statusText.includes( "does not have any commits yet" ) ) {
                    hasError = true;
                }
            }
            else if ( !res.data ) {
                hasError = true;
            }
            else {
                let ref;

                [status.hash, status.abbrev, status.date, ref] = res.data.split( "\n" );

                ref = ref.split( "," );

                // parse current branch
                const branch = ref.shift().match( /->\s(.+)/ );
                if ( branch ) status.branch = branch[1];

                // parse tags
                for ( const token of ref ) {
                    const tag = token.match( /tag:\s(.+)/ );
                    if ( tag ) status.tags.push( tag[1] );
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
                    status.currentVersion = new Semver( match[1] );

                    status.currentVersionDistance = +match[2];

                    cv.end();
                }
                else if ( Semver.isValid( res.data ) ) {
                    status.currentVersion = new Semver( res.data );

                    status.currentVersionDistance = 0;

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
                            status.currentVersionDistance = +res.data.trim();
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
                status.isDirty = !!res.data;
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

                    const match = line.match( BRANCH_RE );

                    if ( match ) {
                        status.pushStatus[match.groups.branch || match.groups.head] = match.groups.ahead ? +match.groups.ahead : 0;
                    }
                    else {
                        throw Error`Unable to parse git output: ${line}`;
                    }
                }
            }

            cv.end();
        } );

        // get releases
        cv.begin();
        this.run( "tag" ).then( res => {
            if ( !res.ok ) {
                hasError = true;
            }
            else {
                status.releases = new Releases( res.data.split( /\n/ ) );
            }

            cv.end();
        } );

        return cv.end().recv( () => {
            if ( hasError ) {
                return result( 500 );
            }
            else {
                return result( 200, status );
            }
        } );
    }

    async getChanges ( tag ) {
        if ( tag instanceof Semver ) {
            if ( tag.isNull ) tag = null;
            else tag = tag.toVersionString();
        }

        const args = ["log", "--pretty=format:%H%x00%h%x00%cI%x00%s"];

        if ( tag ) args.push( tag + "..HEAD" );

        const res = await this.run( ...args );

        if ( !res.ok ) return res;

        const commits = [];

        if ( res.data ) {
            for ( const commit of res.data.split( "\n" ) ) {
                const [hash, abbrev, date, message] = commit.split( "\0" );

                commits.push( {
                    message,
                    hash,
                    abbrev,
                    date,
                } );
            }
        }

        return result( 200, new Changes( commits ) );
    }

    async createObject ( data ) {
        const args = ["hash-object", "-w", "--stdin"];

        if ( this.root ) args.unshift( "-C", this.root );

        return new Promise( resolve => {
            const child = childProcess.spawn( "git", args, {
                "encoding": "utf8",
                "stdio": "pipe",
            } );

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
