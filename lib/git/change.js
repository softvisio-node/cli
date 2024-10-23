export default class Change {
    #commit;
    #commits = new Map();

    constructor ( commit ) {
        this.addCommit( commit );
    }

    // properties
    get id () {
        return this.#commit.changeId;
    }

    get isBreaking () {
        return this.#commit.isBreaking;
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

    get isOtherType () {
        return this.#commit.isOtherType;
    }

    get commits () {
        return this.#commits;
    }

    // public
    addCommit ( commit ) {
        if ( !this.#commit ) {
            this.#commit = commit;
        }
        else {
            if ( this.#commit.changeId !== commit.changeId ) {
                throw new Error( "Commit is not valid" );
            }

            if ( commit.isBreaking ) {
                this.#commit = commit;
            }
        }

        this.#commits.set( commit.hash, commit );
    }
}
