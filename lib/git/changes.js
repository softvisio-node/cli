import fs from "node:fs";
import ejs from "#core/ejs";
import { resolve } from "#core/utils";
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
        const changes = new Map(),
            hashes = new Map();

        commits = commits
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
    // XXX
    async createChangeLog ( { upstream, previousVersion, newVersion } = {} ) {
        previousVersion = !previousVersion || previousVersion.isNull
            ? null
            : previousVersion;

        newVersion = !newVersion || newVersion.isNull
            ? null
            : newVersion;

        const log = await ejs.renderFile( resolve( "#resources/templates/changelog.md.ejs", import.meta.url ), {
            "changes": this,
            "compareUrl": !previousVersion || !newVersion
                ? null
                : upstream?.getCompareUrl( previousVersion.toVersionString(), newVersion.toVersionString() ),
            previousVersion,
            newVersion,
            upstream,
        } );

        fs.writeFileSync( "2.md", log );

        return log;
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
