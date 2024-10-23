import Change from "./change.js";
import Commit from "./commit.js";

export default class Changes {
    #changes = new Map();
    #breaking;
    #feat;
    #fix;
    #featNonBreaking;
    #fixNonBreaking;
    #other;
    #otherNonBreaking;

    constructor ( commits = [] ) {
        for ( let commit of commits ) {
            commit = Commit.new( commit );

            let change = this.#changes.get( commit.changeId );

            if ( !change ) {
                change = new Change( commit );

                this.#changes.set( change.id, change );
            }
            else {
                change.addCommit( commit );
            }
        }
    }

    // properties
    // XXX
    get hasChanges () {
        return !!this.#changes.length;
    }

    // XXX
    get total () {
        return this.#changes.length;
    }

    // XXX
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

    get other () {
        this.#other ??= this.#changes.filter( commit => commit.isOtherType );

        return this.#other;
    }

    get otherNonBreaking () {
        this.#otherNonBreaking ??= this.#changes.filter( commit => commit.isOtherType && !commit.isBreaking );

        return this.#otherNonBreaking;
    }

    // public
    report () {
        console.log( `Total changes:    ${ this.total || "-" }` );
        console.log( `Breaking changes: ${ this.breaking.length || "-" }` );
        console.log( `Features:         ${ this.feat.length || "-" }` );
        console.log( `Fixes:            ${ this.fix.length || "-" }` );
        console.log( `Other:            ${ this.other.length || "-" }` );
    }
}
