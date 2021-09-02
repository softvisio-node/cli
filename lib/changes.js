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

        this.#changes = Object.values( index ).sort( this.#sort );
    }

    // static
    static get COMMIT_RE () {
        return COMMIT_RE;
    }

    static parse ( commit ) {
        const match = commit.match( COMMIT_RE );

        commit = {
            "type": match?.groups?.type ?? "",
            "scope": match?.groups?.scope ?? "",
            "breaking": match ? !!match.groups.breaking : false,
            "description": match ? match.groups.description.trim() : commit.trim(),
        };

        if ( commit.type ) {
            commit.raw = `${commit.type}${commit.scope ? `(${commit.scope})` : ""}${commit.breaking ? "!" : ""}: ${commit.description}`;
        }
        else {
            commit.raw = commit.description;
        }

        return commit;
    }

    // properties
    get total () {
        return this.#changes.length;
    }

    get changes () {
        return this.#changes;
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
        console.log( `Total changes:    ${this.total}` );
        console.log( `Breaking changes: ${this.breaking.length || "-"}` );
        console.log( `Features:         ${this.feat.length || "-"}` );
        console.log( `Fixes:            ${this.fix.length || "-"}` );
    }

    // private
    #sort ( a, b ) {
        return ( a.type || "\xff" ).localeCompare( b.type || "\xff" ) || a.scope.localeCompare( b.scope ) || a.description.localeCompare( b.description );
    }
}
