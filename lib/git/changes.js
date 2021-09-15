const COMMIT_RE = /^(?<type>[a-z0-9]+)(?:\((?<scope>[a-z0-9]+)\))?(?<breaking>!)?: (?<description>[^\n]+)/;

class Commit {
    #messageId;
    #hash;
    #abbrev;
    #abbrev4;
    #type;
    #scope;
    #breaking;
    #description;
    #message;
    #hashes;
    #abbrevs;

    constructor ( commit ) {
        if ( typeof commit === "object" ) {
            this.#hash = commit.hash;
            this.#abbrev = commit.abbrev || undefined;

            commit = commit.message;
        }

        const match = commit.match( COMMIT_RE );

        this.#type = match?.groups?.type ?? "";
        this.#scope = match?.groups?.scope ?? "";
        this.#breaking = match ? !!match.groups.breaking : false;
        this.#description = match ? match.groups.description.trim() : commit.trim();
    }

    // properties
    get messageId () {
        this.#messageId ??= this.#type ? `${this.#type}(${this.#scope}):${this.#description}` : this.#description;

        return this.#messageId;
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
            else this.#abbrev4 = this.#hash.substr( 0, 4 );
        }

        return this.#abbrev4;
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

    get message () {
        this.#message ??= this.#type ? `${this.#type}${this.#scope ? `(${this.#scope})` : ""}${this.#breaking ? "!" : ""}: ${this.#description}` : this.#description;

        return this.#message;
    }

    get hashes () {
        if ( !this.#hashes ) {
            this.#hashes = [];

            if ( this.#hash ) this.#hashes.push( this.#hash );
        }

        return this.#hashes;
    }

    get abbrevs () {
        if ( !this.#abbrevs ) {
            this.#abbrevs = [];

            if ( this.abbrev ) this.#abbrevs.push( this.abbrev );
        }

        return this.#abbrevs;
    }

    // public
    toString () {
        return this.message;
    }

    toJSON () {
        return this.message;
    }
}

export default class Changes {
    #changes;
    #breaking;
    #feat;
    #fix;
    #featNonBreaking;
    #fixNonBreaking;

    constructor ( commits = [] ) {
        const index = {};

        for ( let commit of commits ) {
            commit = new Commit( commit );

            if ( index[commit.messageId] && index[commit.messageId].breaking ) {
                if ( commit.hash ) {
                    index[commit.messageId].hashes.push( commit.hash );
                    index[commit.messageId].abbrevs.push( commit.abbrev );
                }

                continue;
            }

            index[commit.messageId] = commit;
        }

        this.#changes = Object.values( index ).sort( this.#sort );
    }

    // static
    static get Commit () {
        return Commit;
    }

    // properties
    get total () {
        return this.#changes.length;
    }

    get changes () {
        return this.#changes;
    }

    get breaking () {
        this.#breaking ??= this.#changes.filter( commit => commit.breaking );

        return this.#breaking;
    }

    get feat () {
        this.#feat ??= this.#changes.filter( commit => commit.type === "feat" );

        return this.#feat;
    }

    get featNonBreaking () {
        this.#featNonBreaking ??= this.#changes.filter( commit => commit.type === "feat" && !commit.breaking );

        return this.#featNonBreaking;
    }

    get fix () {
        this.#fix ??= this.#changes.filter( commit => commit.type === "fix" );

        return this.#fix;
    }

    get fixNonBreaking () {
        this.#fixNonBreaking ??= this.#changes.filter( commit => commit.type === "fix" && !commit.breaking );

        return this.#fixNonBreaking;
    }

    // public
    report () {
        console.log( `Total changes:    ${this.total}` );
        console.log( `Breaking changes: ${this.breaking.length || "-"}` );
        console.log( `Features:         ${this.feat.length || "-"}` );
        console.log( `Fixes:            ${this.fix.length || "-"}` );
    }

    // private
    #sort ( a, b ) {
        return ( a.type || "\xff" ).localeCompare( b.type || "\xff" ) || a.scope.localeCompare( b.scope ) || a.description.localeCompare( b.description );
    }
}
