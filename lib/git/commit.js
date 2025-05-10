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
    #type;
    #scope;
    #isBreakingChange;
    #subjectText;
    #bodyText;
    #footers = new Footers();
    #revertHash;

    constructor ( { message, hash, abbrev, date } ) {
        super();

        this.#hash = hash || null;
        this.#abbrev = abbrev || null;
        this.#date = date
            ? new Date( date )
            : null;

        let subject, body;

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
            const blocks = body
                .split( /\n+/ )
                .map( block => {
                    block.trim();

                    if ( !block ) return block;

                    const lines = block.split( "\n" ).map( line => line.trim() );

                    let footers;

                    for ( const line of lines ) {
                        const match = line.match( /^(?<key>(BREAKING CHANGE|[\dA-Za-z-]+))(?:: | #)(?<value>.*)$/ );

                        // not a footer
                        if ( !match ) {
                            footers = null;

                            break;
                        }

                        footers ??= {};
                        footers[ match.groups.key ] ??= [];
                        const value = match.groups.value.trim();
                        if ( value ) footers[ match.groups.key ].push( value );
                    }

                    if ( footers ) {
                        this.#footers.add( footers );

                        return null;
                    }

                    // not a footers block
                    else {
                        return lines.join( "\n" );
                    }
                } )
                .filter( block => block );

            this.#bodyText = blocks.join( "\n\n" );
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

    get isBreakingChange () {
        return this.#isBreakingChange;
    }

    get type () {
        return this.#type;
    }

    get scope () {
        return this.#scope;
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

    // public
    compare ( commit ) {
        commit = this.constructor.new( commit );

        return super.compare( commit ) || this.hash?.localeCompare( commit.hash ) || 0;
    }
}
