import Change from "./change.js";
import Commit from "./commit.js";

export default class Changes {
    #changes = [];
    #breakingChanges;
    #featureChanges;
    #featNonBreaking;
    #fix;
    #fixNonBreaking;
    #other;
    #otherNonBreaking;

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

    get hasFeatures () {
        return !!this.feat.length;
    }

    get hasFixes () {
        return !!this.fix.length;
    }

    get breakingChanges () {
        this.#breakingChanges ??= this.#changes.filter( change => change.isBreaking );

        return this.#breakingChanges;
    }

    get featureChanges () {
        this.#featureChanges ??= this.#changes.filter( change => change.isFeature );

        return this.#featureChanges;
    }

    get featNonBreaking () {
        this.#featNonBreaking ??= this.#changes.filter( change => change.isFeature && !change.isBreaking );

        return this.#featNonBreaking;
    }

    get fix () {
        this.#fix ??= this.#changes.filter( change => change.isFix );

        return this.#fix;
    }

    get fixNonBreaking () {
        this.#fixNonBreaking ??= this.#changes.filter( change => change.isFix && !change.isBreaking );

        return this.#fixNonBreaking;
    }

    get other () {
        this.#other ??= this.#changes.filter( change => change.isOther );

        return this.#other;
    }

    get otherNonBreaking () {
        this.#otherNonBreaking ??= this.#changes.filter( change => change.isOther && !change.isBreaking );

        return this.#otherNonBreaking;
    }

    // public
    report () {
        console.log( `Total changes:    ${ this.size || "-" }` );
        console.log( `Breaking changes: ${ this.breakingChanges.length || "-" }` );
        console.log( `Features:         ${ this.featureChanges.length || "-" }` );
        console.log( `Fixes:            ${ this.fix.length || "-" }` );
        console.log( `Other:            ${ this.other.length || "-" }` );
    }

    [ Symbol.iterator ] () {
        return this.#changes.values();
    }
}
