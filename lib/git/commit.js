const COMMIT_SUBJECT_RE = /^(?<type>[\da-z]+)(?:\((?<scope>[\da-z]+)\))?(?<breaking>!)?: (?<description>.+)/,
    KNOWN_TYPES = new Set( [ "feat", "fix" ] );

export default class Commit {
    #changeId;
    #hash;
    #abbrev;
    #abbrev4;
    #date;
    #type;
    #scope;
    #breaking;
    #description;
    #message;
    #subject;
    #body;

    constructor ( commit ) {
        this.#hash = commit.hash || null;
        this.#abbrev = commit.abbrev || null;
        this.#date = commit.date
            ? new Date( commit.date )
            : null;

        const message = typeof commit === "object"
                ? commit.message
                : commit,
            idx = message.indexOf( "\n" );

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
        this.#description = match
            ? match.groups.description.trim()
            : subject.trim();
    }

    // properties
    get changeId () {
        this.#changeId ??= this.#type
            ? `${ this.#type }(${ this.#scope }):${ this.#description }`
            : this.#description;

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
            if ( !this.#hash ) this.#abbrev4 = null;
            else this.#abbrev4 = this.#hash.slice( 0, 4 );
        }

        return this.#abbrev4;
    }

    get date () {
        return this.#date;
    }

    get isBreaking () {
        return this.#breaking;
    }

    get isOtherType () {
        return !KNOWN_TYPES.has( this.type );
    }

    get type () {
        return this.#type;
    }

    get scope () {
        return this.#scope;
    }

    get description () {
        return this.#description;
    }

    get subject () {
        this.#subject ??= this.#type
            ? `${ this.#type }${ this.#scope
                ? `(${ this.#scope })`
                : "" }${ this.#breaking
                ? "!"
                : "" }: ${ this.#description }`
            : this.#description;

        return this.#subject;
    }

    get body () {
        return this.#body;
    }

    get message () {
        this.#message ??= this.subject + "\n" + this.#body;

        return this.#message;
    }

    // public
    toString () {
        return this.subject;
    }

    toJSON () {
        return this.subject;
    }
}
