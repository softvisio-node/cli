import Semver from "#lib/semver";

export default class Releases {
    #releases = {};
    #latest;
    #latestMajor = {};

    constructor ( releases = [] ) {
        for ( const release of releases ) {
            if ( !Semver.isValid( release ) ) continue;

            const version = new Semver( release );

            this.#releases[release] = version;

            if ( !version.isPreRelease && ( !this.#latest || version.gt( this.#latest ) ) ) this.#latest = version;

            if ( !this.#latestMajor[version.major] || version.gt( this.#latestMajor[version.major] ) ) this.#latestMajor[version.major] = version;
        }
    }

    // properties
    get latest () {
        return this.#latest;
    }

    // public
    getLatestMajor ( major ) {
        return this.#latestMajor[major];
    }
}
