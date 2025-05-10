import Commit from "./commit.js";
import Common from "./common.js";

export default class Change extends Common {
    #commit;
    #commits = new Map();
    #isBreakingChange;
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

    get isBreakingChange () {
        return this.#isBreakingChange;
    }

    get type () {
        return this.#type;
    }

    get scope () {
        return this.#commit.scope;
    }

    get subjectText () {
        return this.#commit.subjectText;
    }

    get bodyText () {
        return this.#commit.bodyText;
    }

    get footers () {
        return this.#commit.footers;
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

        if ( commit.breakingPriority < this.breakingPriority ) this.#isBreakingChange = commit.isBreakingChange;
        if ( commit.typePriority < this.typePriority ) this.#type = commit.type;
    }

    compare ( change ) {
        change = this.constructor.new( change );

        return super.compare( change );
    }
}
