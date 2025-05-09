export default class Change {
    #commit;
    #commits = new Map();

    constructor ( commit ) {
        this.addCommit( commit );
    }

    // static
    static new ( commit ) {
        if ( commit instanceof Change ) return commit;

        return new this.constructor( commit );
    }

    static get compare () {
        return ( a, b ) => this.new( a ).compare( b );
    }

    // properties
    get id () {
        return this.#commit.changeId;
    }

    get isBreaking () {
        return this.#commit.isBreaking;
    }

    get priority () {
        return this.#commit.priority;
    }

    get type () {
        return this.#commit.type;
    }

    get scope () {
        return this.#commit.scope;
    }

    get title () {
        return this.#commit.title;
    }

    get subject () {
        return this.#commit.subject;
    }

    get body () {
        return this.#commit.body;
    }

    get message () {
        return this.#commit.message;
    }

    get isFeature () {
        return this.#commit.isFeature;
    }

    get isFix () {
        return this.#commit.isFix;
    }

    get isOther () {
        return this.#commit.isOther;
    }

    get commits () {
        return this.#commits;
    }

    // public
    addCommit ( commit ) {
        if ( !this.#commit ) {
            this.#commit = commit;
        }
        else if ( this.#commit.changeId !== commit.changeId ) {
            throw new Error( "Commit is not related to the change" );
        }
        else if ( commit.priority < this.#commit.priority ) {
            this.#commit = commit;
        }

        this.#commits.set( commit.hash, commit );
    }

    compare ( change ) {
        return this.priority - change.priority || this.type.localeCompare( change.type ) || this.scope.localeCompare( change.scope ) || this.subject.localeCompare( change.subject ) || 0;
    }
}
