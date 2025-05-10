import Common from "./common.js";

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
    #breaking;
    #message;
    #subjectText;
    #body;
    #revertHash;

    constructor ( { message, hash, abbrev, date } ) {
        super();

        this.#hash = hash || null;
        this.#abbrev = abbrev || null;
        this.#date = date
            ? new Date( date )
            : null;

        const idx = message.indexOf( "\n" );

        let subject;

        if ( idx === -1 ) {
            subject = message;
            this.#body = "";
        }
        else {
            subject = message.slice( 0, idx );
            this.#body = message.slice( idx + 1 ).trim();
        }

        const match = subject.match( COMMIT_SUBJECT_RE );

        this.#type = match?.groups?.type ?? "";
        this.#scope = match?.groups?.scope ?? "";
        this.#breaking = match
            ? !!match.groups.breaking
            : false;
        this.#subjectText = match
            ? match.groups.subjectText.trim()
            : subject.trim();
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

    get isBreaking () {
        return this.#breaking;
    }

    get type () {
        return this.#type;
    }

    get scope () {
        return this.#scope;
    }

    get message () {
        this.#message ??= this.subject + ( this.#body
            ? "\n" + this.#body
            : "" );

        return this.#message;
    }

    get subjectText () {
        return this.#subjectText;
    }

    get body () {
        return this.#body;
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
