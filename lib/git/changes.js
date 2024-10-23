import Commit from "./commit.js";

export default class Changes {
    #changes;
    #breaking;
    #feat;
    #fix;
    #featNonBreaking;
    #fixNonBreaking;
    #other;
    #otherNonBreaking;

    constructor ( commits = [] ) {
        const index = {};

        for ( let commit of commits ) {
            commit = new Commit( commit );

            // commit is already indexed
            if ( index[ commit.changeId ] ) {

                // do not replace breaking commits in the index
                if ( index[ commit.changeId ].isBreaking || !commit.isBreaking ) {

                    // index[ commit.changeId ].commits.push( commit );
                }

                // replace indexed commit with the breaking commit
                else {
                    commit.commits.unshift( ...index[ commit.changeId ].commits );

                    index[ commit.changeId ] = commit;
                }
            }

            // first commit
            else {
                index[ commit.changeId ] = commit;
            }
        }

        this.#changes = Object.values( index ).sort( this.#sort );
    }

    // static
    static get Commit () {
        return Commit;
    }

    // properties
    get hasChanges () {
        return !!this.#changes.length;
    }

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

    // private
    #sort ( a, b ) {
        return ( a.type || "\xFF" ).localeCompare( b.type || "\xFF" ) || a.scope.localeCompare( b.scope ) || a.description.localeCompare( b.description );
    }
}
