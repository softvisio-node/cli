const COMMIT_RE = /^(?<type>[a-z0-9]+)(?:\((?<scope>[a-z0-9]+)\))?(?<breaking>!)?: (?<description>[^\n]+)/;

export default class Changes {
    #changes;
    #breaking;
    #feat;
    #fix;

    constructor ( changes ) {
        const index = {};

        for ( let commit of changes ) {
            commit = Changes.parse( commit );

            const id = commit.type ? `${commit.type}(${commit.scope}):${commit.description}` : commit.description;

            if ( index[id] && index[id].breaking ) continue;

            index[id] = commit;
        }

        this.#changes = Object.values( index );
    }

    // static
    static get COMMIT_RE () {
        return COMMIT_RE;
    }

    static parse ( commit ) {
        const match = commit.match( COMMIT_RE );

        return {
            "type": match?.groups?.type,
            "scope": match?.groups?.scope ?? "",
            "breaking": match ? !!match.groups.breaking : false,
            "description": match ? match.groups.description.trim() : commit.trim(),
        };
    }

    // properties
    get total () {
        return this.#changes.length;
    }

    get breaking () {
        this.#breaking ??= this.#changes.filter( commit => commit.breaking );

        return this.#breaking;
    }

    get feat () {
        this.#feat ??= this.#changes.filter( commit => commit.type === "feat" );

        return this.#feat;
    }

    get fix () {
        this.#fix ??= this.#changes.filter( commit => commit.type === "fix" );

        return this.#fix;
    }

    // public
    report () {
        console.log( `Total commits:    ${this.total}` );
        console.log( `Breaking changes: ${this.breaking.length || "-"}` );
        console.log( `Features:         ${this.feat.length || "-"}` );
        console.log( `Fixes:            ${this.fix.length || "-"}` );
    }
}
