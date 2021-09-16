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
    #commits;

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

    get isBreaking () {
        return this.#breaking;
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

    get commits () {
        this.#commits ??= [this];

        return this.#commits;
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

            // commit is already indexed
            if ( index[commit.messageId] ) {

                // do not replace breaking commits in the index
                if ( index[commit.messageId].isBreaking || !commit.isBreaking ) {
                    index[commit.messageId].commits.push( commit );
                }

                // replace indexed commit with the breaking commit
                else {
                    commit.commits.unshift( ...index[commit.messageId].commits );

                    index[commit.messageId] = commit;
                }
            }

            // first commit
            else {
                index[commit.messageId] = commit;
            }
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
        this.#breaking ??= this.#changes.filter( commit => commit.isBreaking );

        return this.#breaking;
    }

    get feat () {
        this.#feat ??= this.#changes.filter( commit => commit.type === "feat" );

        return this.#feat;
    }

    get featNonBreaking () {
        this.#featNonBreaking ??= this.#changes.filter( commit => commit.type === "feat" && !commit.isBreaking );

        return this.#featNonBreaking;
    }

    get fix () {
        this.#fix ??= this.#changes.filter( commit => commit.type === "fix" );

        return this.#fix;
    }

    get fixNonBreaking () {
        this.#fixNonBreaking ??= this.#changes.filter( commit => commit.type === "fix" && !commit.isBreaking );

        return this.#fixNonBreaking;
    }

    // public
    linkifyMessage ( upstream ) {
        if ( !upstream ) return this.message;
        else return upstream.linkifyMessage( this.message );
    }

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
