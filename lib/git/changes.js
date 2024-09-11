const COMMIT_SUBJECT_RE = /^(?<type>[a-z0-9]+)(?:\((?<scope>[a-z0-9]+)\))?(?<breaking>!)?: (?<description>.+)/;

class Commit {
    #subjectId;
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
    #commits;

    constructor ( commit ) {
        this.#hash = commit.hash || null;
        this.#abbrev = commit.abbrev || null;
        this.#date = commit.date ? new Date( commit.date ) : null;

        const message = typeof commit === "object" ? commit.message : commit,
            idx = message.indexOf( "\n" );

        let subject;

        if ( idx === -1 ) {
            subject = message;
            this.#body = "";
        }
        else {
            subject = message.substring( 0, idx );
            this.#body = message.substring( idx + 1 ).trim();
        }

        const match = subject.match( COMMIT_SUBJECT_RE );

        this.#type = match?.groups?.type ?? "";
        this.#scope = match?.groups?.scope ?? "";
        this.#breaking = match ? !!match.groups.breaking : false;
        this.#description = match ? match.groups.description.trim() : subject.trim();
    }

    // properties
    get subjectId () {
        this.#subjectId ??= this.#type ? `${ this.#type }(${ this.#scope }):${ this.#description }` : this.#description;

        return this.#subjectId;
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
            else this.#abbrev4 = this.#hash.substring( 0, 4 );
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

    get description () {
        return this.#description;
    }

    get subject () {
        this.#subject ??= this.#type ? `${ this.#type }${ this.#scope ? `(${ this.#scope })` : "" }${ this.#breaking ? "!" : "" }: ${ this.#description }` : this.#description;

        return this.#subject;
    }

    get body () {
        return this.#body;
    }

    get message () {
        this.#message ??= this.subject + "\n" + this.#body;

        return this.#message;
    }

    get commits () {
        this.#commits ??= [ this ];

        return this.#commits;
    }

    // public
    toString () {
        return this.subject;
    }

    toJSON () {
        return this.subject;
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
            if ( index[ commit.subjectId ] ) {

                // do not replace breaking commits in the index
                if ( index[ commit.subjectId ].isBreaking || !commit.isBreaking ) {
                    index[ commit.subjectId ].commits.push( commit );
                }

                // replace indexed commit with the breaking commit
                else {
                    commit.commits.unshift( ...index[ commit.subjectId ].commits );

                    index[ commit.subjectId ] = commit;
                }
            }

            // first commit
            else {
                index[ commit.subjectId ] = commit;
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
    report () {
        console.log( `Total changes:    ${ this.total || "-" }` );
        console.log( `Breaking changes: ${ this.breaking.length || "-" }` );
        console.log( `Features:         ${ this.feat.length || "-" }` );
        console.log( `Fixes:            ${ this.fix.length || "-" }` );
    }

    // private
    #sort ( a, b ) {
        return ( a.type || "\xFF" ).localeCompare( b.type || "\xFF" ) || a.scope.localeCompare( b.scope ) || a.description.localeCompare( b.description );
    }
}
