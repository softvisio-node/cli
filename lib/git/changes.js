import Change from "./change.js";
import Commit from "./commit.js";

export default class Changes {
    #changes = [];
    #breakingChanges;
    #featureChanges;
    #featureNonBreakingChanges;
    #fixChanges;
    #fixNonBreakingChanges;
    #otherChanges;
    #otherNonBreakingChanges;

    constructor ( commits = [] ) {
        const changes = new Map();

        for ( let commit of commits ) {
            commit = Commit.new( commit );

            let change = changes.get( commit.changeId );

            if ( !change ) {
                change = new Change( commit );

                changes.set( change.id, change );
            }
            else {
                change.addCommit( commit );
            }

            this.#changes = [ ...changes.values() ].sort( ( a, b ) => a.compare( b ) );
        }
    }

    // properties
    get size () {
        return this.#changes.length;
    }

    get hasChanges () {
        return !!this.#changes.length;
    }

    get hasBreakingChanges () {
        return !!this.breakingChanges.length;
    }

    get hasFeatureChanges () {
        return !!this.featureChanges.length;
    }

    get hasFixChanges () {
        return !!this.fixChanges.length;
    }

    get hasOtherChanges () {
        return !!this.otherChanges.length;
    }

    get breakingChanges () {
        this.#breakingChanges ??= this.#changes.filter( change => change.isBreaking );

        return this.#breakingChanges;
    }

    get featureChanges () {
        this.#featureChanges ??= this.#changes.filter( change => change.isFeature );

        return this.#featureChanges;
    }

    get featureNonBreakingChanges () {
        this.#featureNonBreakingChanges ??= this.#changes.filter( change => change.isFeature && !change.isBreaking );

        return this.#featureNonBreakingChanges;
    }

    get fixChanges () {
        this.#fixChanges ??= this.#changes.filter( change => change.isFix );

        return this.#fixChanges;
    }

    get fixNonBreakingChanges () {
        this.#fixNonBreakingChanges ??= this.#changes.filter( change => change.isFix && !change.isBreaking );

        return this.#fixNonBreakingChanges;
    }

    get otherChanges () {
        this.#otherChanges ??= this.#changes.filter( change => change.isOther );

        return this.#otherChanges;
    }

    get otherNonBreakingChanges () {
        this.#otherNonBreakingChanges ??= this.#changes.filter( change => change.isOther && !change.isBreaking );

        return this.#otherNonBreakingChanges;
    }

    // public
    report () {
        console.log( `Total changes:    ${ this.size || "-" }` );
        console.log( `Breaking changes: ${ this.breakingChanges.length || "-" }` );
        console.log( `Features:         ${ this.featureChanges.length || "-" }` );
        console.log( `Fixes:            ${ this.fixChanges.length || "-" }` );
        console.log( `Other:            ${ this.otherChanges.length || "-" }` );
    }

    [ Symbol.iterator ] () {
        return this.#changes.values();
    }
}
