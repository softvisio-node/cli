import Semver from "#lib/semver";

export default class Releases {
    #releases = {};
    #last;
    #latest;
    #latestMajor = {};

    constructor ( releases = [] ) {
        for ( const release of releases ) {
            if ( !Semver.isValid( release ) ) continue;

            const version = new Semver( release );

            this.#releases[version] = version;

            if ( !this.#last || version.gt( this.#last ) ) this.#last = version;

            if ( !version.isPreRelease && ( !this.#latest || version.gt( this.#latest ) ) ) this.#latest = version;

            if ( !this.#latestMajor[version.major] || version.gt( this.#latestMajor[version.major] ) ) this.#latestMajor[version.major] = version;
        }

        this.#last ??= new Semver();
        this.#latest ??= new Semver();
    }

    // properties
    get last () {
        return this.#last;
    }

    get latest () {
        return this.#latest;
    }

    get releases () {
        return Object.values( this.#releases );
    }

    // public
    has ( release ) {
        return !!this.#releases[release];
    }

    get ( release ) {
        return this.#releases[release];
    }

    getLatestMajor ( major ) {
        return this.#latestMajor[major];
    }
}
