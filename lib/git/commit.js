import Common from "./common.js";
import Footers from "./footers.js";

// DOCS: https://www.conventionalcommits.org/
// DOCS: https://git-scm.com/docs/git-interpret-trailers

const COMMIT_SUBJECT_RE = /^(?<type>[\da-z-]+)(?:\((?<scope>[\da-z-]+)\))?(?<breaking>!)?: (?<subjectText>.+)/;

export default class Commit extends Common {
    #changeId;
    #hash;
    #abbrev;
    #date;
    #author;
    #isHead;
    #branch;
    #branches;
    #tags;
    #parentHashes;
    #type;
    #scope;
    #isBreakingChange;
    #subjectText;
    #bodyText;
    #footers = new Footers();
    #revertHash;
    #links;
    #fixes;
    #commits = new Map();
    #authors = new Set();

    constructor ( { message, hash, abbrev, date, author, isHead, branch, branches, tags, parentHashes } ) {
        super();

        this.#hash = hash || null;
        this.#abbrev = abbrev || null;

        this.#date = date
            ? new Date( date )
            : null;

        if ( author ) {
            this.#author = author;
            this.#authors.add( author );
        }

        this.#commits.set( abbrev, this );

        this.#isHead = isHead;
        this.#branch = branch;
        this.#branches = branches || new Set();
        this.#tags = tags || new Set();

        this.#parentHashes = parentHashes || new Set();

        let subject, body;

        // replace tabs, trim line trailing spaces
        message = message
            .replaceAll( "\t", " ".repeat( 4 ) )
            .replaceAll( / +$/gm, "" )
            .replaceAll( /\n{3,}/g, "\n\n" )
            .trim();

        // parse message
        const idx = message.indexOf( "\n" );

        if ( idx === -1 ) {
            subject = message;
            body = "";
        }
        else {
            subject = message.slice( 0, idx );
            body = message.slice( idx + 1 ).trim();
        }

        // parse subject
        const match = subject.match( COMMIT_SUBJECT_RE );

        this.#type = match?.groups?.type ?? "";
        this.#scope = match?.groups?.scope ?? "";
        this.#isBreakingChange = match
            ? !!match.groups.breaking
            : false;
        this.#subjectText = match
            ? match.groups.subjectText.trim()
            : subject.trim();

        // parse body
        if ( body ) {

            // find first footer
            const match = body.match( /(?:^|\n{2,})(?:breaking[ -]change|[\da-z-]+) *: */i );

            // no footers found
            if ( !match ) {
                this.#bodyText = body;
            }

            // footers found
            else {
                this.#bodyText = body.slice( 0, match.index );

                const footers = body.slice( match.index ).split( /^(breaking[ -]change|[\da-z-]+) *: */im );

                for ( let n = 1; n < footers.length; n += 2 ) {

                    // breaking change footer
                    if ( /^breaking[ -]change$/i.test( footers[ n ] ) ) {
                        this.#isBreakingChange = true;

                        const text = footers[ n + 1 ].trim();

                        if ( text ) {
                            if ( this.#bodyText ) {
                                this.#bodyText += "\n\n" + text;
                            }
                            else {
                                this.#bodyText = text;
                            }
                        }
                    }

                    // other footer
                    else {
                        this.#footers.add( footers[ n ], footers[ n + 1 ] );
                    }
                }
            }
        }
        else {
            this.#bodyText = "";
        }
    }

    // static
    static new ( commit ) {
        if ( commit instanceof this ) return commit;

        return new this( commit );
    }

    static get compare () {
        return ( a, b ) => this.new( a ).compare( b );
    }

    // properties
    get changeId () {
        if ( this.#changeId == null ) {
            this.#changeId = this.#scope + "/" + this.#subjectText;
        }

        return this.#changeId;
    }

    get hash () {
        return this.#hash;
    }

    get abbrev () {
        return this.#abbrev || this.#hash;
    }

    get date () {
        return this.#date;
    }

    get author () {
        return this.#author;
    }

    get isHead () {
        return this.#isHead;
    }

    get isDetachedHead () {
        return this.isHead && !this.branch;
    }

    get branch () {
        return this.#branch;
    }

    get branches () {
        return this.#branches;
    }

    get tags () {
        return this.#tags;
    }

    get isBreakingChange () {
        return this.#isBreakingChange;
    }

    get type () {
        return this.#type;
    }

    get scope () {
        return this.#scope;
    }

    get isMerge () {
        return this.#parentHashes.size > 1;
    }

    get subjectText () {
        return this.#subjectText;
    }

    get bodyText () {
        return this.#bodyText;
    }

    get footers () {
        return this.#footers;
    }

    get revertHash () {
        if ( this.#revertHash === undefined ) {
            this.#revertHash = null;

            if ( this.isRevert ) {
                const match = this.body.match( /This reverts commit ([\da-f]+)/ );

                if ( match ) {
                    this.#revertHash = match[ 1 ];
                }
            }
        }

        return this.#revertHash;
    }

    get fixes () {
        if ( this.#fixes === undefined ) {
            const links = [];

            for ( const match of this.message.matchAll( /(?:^|\W)(?:close[ds]?|fix(?:es|ed)?|resolve(?:s|ds)?) *:? +((?:[\w.-]+\/[\w.-]+)?#\d+)(?:\W|$)/gim ) ) {
                links.push( match[ 1 ] );
            }

            this.#fixes = new Set( links.sort( this.constructor.compareLinks ) );
        }

        return this.#fixes;
    }

    get links () {
        if ( this.#links === undefined ) {
            const links = [];

            for ( const match of this.message.matchAll( /(?:^|\W)((?:[\w.-]+\/[\w.-]+)?#\d+)(?:\W|$)/gm ) ) {
                links.push( match[ 1 ] );
            }

            this.#links = new Set( links.sort( this.constructor.compareLinks ) );
        }

        return this.#links;
    }

    get authors () {
        return this.#authors;
    }

    get commits () {
        return this.#commits;
    }

    // public
    compare ( commit ) {
        commit = this.constructor.new( commit );

        return super.compare( commit ) || this.hash?.localeCompare( commit.hash ) || 0;
    }
}
