export default class Change {
    #commit;
    #commits = [];

    constructor ( commit ) {
        this.#commit = commit;

        this.#commits.push( commit );
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

    get description () {
        return this.#commit.description;
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

    // public
    addCommit ( commit ) {
        this.#commits.push( commit );
    }
}
