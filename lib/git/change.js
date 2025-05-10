import Commit from "./commit.js";
import Priority from "./priority.js";

export default class Change extends Priority {
    #commit;
    #commits = new Map();
    #isBreaking;
    #type;

    constructor ( commit ) {
        super();

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
        return this.#isBreaking;
    }

    get type () {
        return this.#type;
    }

    get scope () {
        return this.#commit.scope;
    }

    get message () {
        return this.#commit.message;
    }

    get subjectText () {
        return this.#commit.subjectText;
    }

    get body () {
        return this.#commit.body;
    }

    get commits () {
        return this.#commits;
    }

    // public
    addCommit ( commit ) {
        commit = Commit.new( commit );

        if ( !this.#commit ) {
            this.#commit = commit;
        }
        else if ( this.#commit.changeId !== commit.changeId ) {
            throw new Error( "Commit is not related to the change" );
        }

        this.#commits.set( commit.hash, commit );

        if ( commit.breakingPriority < this.breakingPriority ) this.#isBreaking = commit.isBreaking;
        if ( commit.typePriority < this.typePriority ) this.#type = commit.type;
    }

    compare ( change ) {
        change = this.constructor.new( change );

        return this.priority - change.priority || this.type.localeCompare( change.type ) || this.scope.localeCompare( change.scope ) || this.subjectText.localeCompare( change.subjectText ) || 0;
    }
}
