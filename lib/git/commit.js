import Priority from "./priority.js";

// DOCS: https://www.conventionalcommits.org/
// DOCS: https://git-scm.com/docs/git-interpret-trailers

const COMMIT_TITLE_RE = /^(?<type>[\da-z-]+)(?:\((?<scope>[\da-z-]+)\))?(?<breaking>!)?: (?<subject>.+)/;

export default class Commit extends Priority {
    #changeId;
    #hash;
    #abbrev;
    #abbrev4;
    #date;
    #type;
    #scope;
    #breaking;
    #message;
    #subject;
    #body;
    #revertHash;

    constructor ( { message, body, hash, abbrev, date } ) {
        super();

        this.#hash = hash || null;
        this.#abbrev = abbrev || null;
        this.#date = date
            ? new Date( date )
            : null;

        const idx = message.indexOf( "\n" );

        let title;

        if ( idx === -1 ) {
            title = message;
            this.#body = body || "";
        }
        else {
            title = message.slice( 0, idx );
            this.#body = message.slice( idx + 1 ).trim();
        }

        const match = title.match( COMMIT_TITLE_RE );

        this.#type = match?.groups?.type ?? "";
        this.#scope = match?.groups?.scope ?? "";
        this.#breaking = match
            ? !!match.groups.breaking
            : false;
        this.#subject = match
            ? match.groups.subject.trim()
            : title.trim();
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
            this.#changeId = this.#scope + "/" + this.#subject;
        }

        return this.#changeId;
    }

    get hash () {
        return this.#hash;
    }

    get abbrev () {
        return this.#abbrev || this.#hash;
    }

    get abbrev4 () {
        if ( this.#abbrev4 === undefined ) {
            if ( !this.#hash ) {
                this.#abbrev4 = null;
            }
            else {
                this.#abbrev4 = this.#hash.slice( 0, 4 );
            }
        }

        return this.#abbrev4;
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
        this.#message ??= this.title + "\n" + this.#body;

        return this.#message;
    }

    get subject () {
        return this.#subject;
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
    toString () {
        return this.title;
    }

    toJSON () {
        return this.toString();
    }

    compare ( commit ) {
        commit = this.constructor.new( commit );

        return this.priority - commit.priority || this.type.localeCompare( commit.type ) || this.scope.localeCompare( commit.scope ) || this.subject.localeCompare( commit.subject ) || this.hash?.localeCompare( commit.hash ) || 0;
    }
}
