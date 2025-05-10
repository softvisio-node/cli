import Commit from "./commit.js";
import Common from "./common.js";
import Footers from "./footers.js";

export default class Change extends Common {
    #id;
    #isBreakingChange;
    #type;
    #scope;
    #subjectText;
    #bodyText;
    #footers = new Footers();
    #commits = new Map();

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
        return this.#id;
    }

    get isBreakingChange () {
        return this.#isBreakingChange;
    }

    get type () {
        return this.#type;
    }

    get scope () {
        return this.#scope;
    }

    get subjectText () {
        return this.#subjectText;
    }

    get bodyText () {
        return this.#bodyText;
    }

    get footers () {
        return this.#footers;
    }

    get commits () {
        return this.#commits;
    }

    // public
    addCommit ( commit ) {
        commit = Commit.new( commit );

        if ( !this.#id ) {
            this.#id = commit.changeId;
            this.#scope = commit.scope;
            this.#subjectText = commit.subjectText;
        }
        else if ( this.#id !== commit.changeId ) {
            throw new Error( "Commit is not related to the change" );
        }

        this.#commits.set( commit.hash, commit );

        if ( commit.breakingPriority < this.breakingPriority ) this.#isBreakingChange = commit.isBreakingChange;
        if ( commit.typePriority < this.typePriority ) this.#type = commit.type;

        if ( commit.bodyText ) {
            this.#bodyText = commit.bodyText;
            this.#footers = commit.footers;
        }
    }

    compare ( change ) {
        change = this.constructor.new( change );

        return super.compare( change );
    }
}
