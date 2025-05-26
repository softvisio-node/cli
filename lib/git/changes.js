import Change from "#core/api/git/change";
import Commit from "#core/api/git/commit";
import ejs from "#core/ejs";
import { resolve } from "#core/utils";

export default class Changes {
    #changes = [];
    #firstCommit;
    #lastCommit;
    #breakingChanges;
    #featureChanges;
    #featureNonBreakingChanges;
    #fixChanges;
    #fixNonBreakingChanges;
    #otherChanges;
    #otherNonBreakingChanges;

    constructor ( commits ) {
        const changes = new Map(),
            hashes = new Map();

        commits = ( commits || [] )
            .map( commit => {
                commit = Commit.new( commit );

                hashes.set( commit.hash, false );

                return commit;
            } )
            .sort( ( a, b ) => b.date - a.date );

        // process revert / reapply commits
        for ( const commit of commits ) {

            // commit is ignored
            if ( hashes.get( commit.hash ) ) {
                continue;
            }

            // merge commits
            else if ( commit.isMerge ) {
                hashes.set( commit.hash, true );
            }

            // revert commit
            else if ( commit.isRevert ) {
                if ( commit.revertHash && hashes.has( commit.revertHash ) ) {
                    hashes.set( commit.hash, true );
                    hashes.set( commit.revertHash, true );
                }
            }
        }

        for ( const commit of commits ) {

            // commit is ignored
            if ( hashes.get( commit.hash ) ) continue;

            let change = changes.get( commit.changeId );

            if ( !change ) {
                change = new Change( commit );

                changes.set( change.id, change );
            }
            else {
                change.addCommit( commit );
            }

            if ( this.#firstCommit ) {
                if ( this.#firstCommit.date > change.firstCommit.date ) {
                    this.#firstCommit = change.firstCommit;
                }
            }
            else {
                this.#firstCommit = change.firstCommit;
            }

            if ( this.#lastCommit ) {
                if ( this.#lastCommit.date < change.lastCommit.date ) {
                    this.#lastCommit = change.lastCommit;
                }
            }
            else {
                this.#lastCommit = change.lastCommit;
            }
        }

        this.#changes = [ ...changes.values() ].sort( this.constructor.compare );
    }

    // static
    static get compare () {
        return Change.compare;
    }

    // properties
    get size () {
        return this.#changes.length;
    }

    get hasChanges () {
        return !!this.#changes.length;
    }

    get firstCommit () {
        return this.#firstCommit;
    }

    get lastCommit () {
        return this.#lastCommit;
    }

    get hasBreakingChanges () {
        return Boolean( this.breakingChanges.length );
    }

    get hasFeatureChanges () {
        return Boolean( this.featureChanges.length );
    }

    get hasFixChanges () {
        return Boolean( this.fixChanges.length );
    }

    get hasOtherChanges () {
        return Boolean( this.otherChanges.length );
    }

    get breakingChanges () {
        this.#breakingChanges ??= this.#changes.filter( change => change.isBreakingChange );

        return this.#breakingChanges;
    }

    get featureChanges () {
        this.#featureChanges ??= this.#changes.filter( change => change.isFeature );

        return this.#featureChanges;
    }

    get featureNonBreakingChanges () {
        this.#featureNonBreakingChanges ??= this.#changes.filter( change => change.isFeature && !change.isBreakingChange );

        return this.#featureNonBreakingChanges;
    }

    get fixChanges () {
        this.#fixChanges ??= this.#changes.filter( change => change.isFix );

        return this.#fixChanges;
    }

    get fixNonBreakingChanges () {
        this.#fixNonBreakingChanges ??= this.#changes.filter( change => change.isFix && !change.isBreakingChange );

        return this.#fixNonBreakingChanges;
    }

    get otherChanges () {
        this.#otherChanges ??= this.#changes.filter( change => change.isOther );

        return this.#otherChanges;
    }

    get otherNonBreakingChanges () {
        this.#otherNonBreakingChanges ??= this.#changes.filter( change => change.isOther && !change.isBreakingChange );

        return this.#otherNonBreakingChanges;
    }

    // public
    async createChangeLog ( { previousReleaseVersion, releaseVerion, upstream } = {} ) {
        previousReleaseVersion = previousReleaseVersion?.versionString;
        releaseVerion = releaseVerion?.versionString;

        return ejs.renderFile( resolve( "#resources/templates/changelog.md.ejs", import.meta.url ), {
            "changes": this,
            "compareUrl": !previousReleaseVersion || !releaseVerion
                ? null
                : upstream?.getCompareUrl( previousReleaseVersion, releaseVerion ),
            previousReleaseVersion,
            releaseVerion,
            "blocks": {
                "Breaking changes": "breakingChanges",
                "Features": "featureNonBreakingChanges",
                "Fixes": "fixNonBreakingChanges",
                "Other changes": "otherNonBreakingChanges",
            },
        } );
    }

    printReport () {
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
