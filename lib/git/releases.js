import Semver from "#lib/semver";

export default class Releases {
    #versions = {};
    #last;
    #latest;
    #latestMajor = {};
    #latestPreRelease = {};

    constructor ( releases = [] ) {
        for ( const release of releases ) {
            if ( !Semver.isValid( release ) ) continue;

            const version = new Semver( release );

            this.#versions[version] = version;

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

    get versions () {
        return Object.values( this.#versions );
    }

    // public
    has ( version ) {
        return !!this.#versions[version];
    }

    get ( version ) {
        return this.#versions[version];
    }

    getLatestPreRelease ( version ) {
        if ( this.#latestPreRelease[version] === undefined ) {
            let latestPreRelease;

            for ( const _version of this.versions ) {

                // version is the pre-release of the new version
                if ( _version.isPreRelease && _version.base.eq( version.base ) ) {

                    // version is the latest pre-release of the new version
                    if ( !latestPreRelease || _version.gt( latestPreRelease ) ) latestPreRelease = _version;
                }
            }

            this.#latestPreRelease[version] = latestPreRelease || null;
        }

        return this.#latestPreRelease[version];
    }
}
