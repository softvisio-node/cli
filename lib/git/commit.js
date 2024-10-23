const COMMIT_TITLE_RE = /^(?<type>[\da-z]+)(?:\((?<scope>[\da-z]+)\))?(?<breaking>!)?: (?<subject>.+)/,
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
    #subject;
    #message;
    #title;
    #body;

    constructor ( { message, hash, abbrev, date } ) {
        this.#hash = hash || null;
        this.#abbrev = abbrev || null;
        this.#date = date
            ? new Date( date )
            : null;

        const idx = message.indexOf( "\n" );

        let title;

        if ( idx === -1 ) {
            title = message;
            this.#body = "";
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

    // properties
    get changeId () {
        this.#changeId ??= this.#type
            ? `${ this.#type }(${ this.#scope }):${ this.#subject }`
            : this.#subject;

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

    get type () {
        return this.#type;
    }

    get scope () {
        return this.#scope;
    }

    get title () {
        this.#title ??= this.#type
            ? `${ this.#type }${ this.#scope
                ? `(${ this.#scope })`
                : "" }${ this.#breaking
                ? "!"
                : "" }: ${ this.#subject }`
            : this.#subject;

        return this.#title;
    }

    get subject () {
        return this.#subject;
    }

    get body () {
        return this.#body;
    }

    get message () {
        this.#message ??= this.title + "\n" + this.#body;

        return this.#message;
    }

    get isFeature () {
        return this.type === "feat";
    }

    get isFix () {
        return this.type === "fix";
    }

    get isOtherType () {
        return !KNOWN_TYPES.has( this.type );
    }

    // public
    toString () {
        return this.title;
    }

    toJSON () {
        return this.toString();
    }
}
