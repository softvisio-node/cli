import semver from "semver";

class Range {
    #range;

    #isPreRelease;

    constructor ( range ) {
        this.#range = range;
    }

    // public
    toString () {
        return this.#range;
    }

    isPreRelease () {
        if ( this.#isPreRelease == null ) this.#isPreRelease = !!semver.minVersion( this.#range ).prerelease;

        return this.#isPreRelease;
    }
}

export default class Semver {
    #version;

    #isValid;
    #major;
    #minor;
    #patch;
    #prerelease;

    static isValid ( version ) {
        return semver.valid( version ) != null;
    }

    static Range () {
        return Range;
    }

    static compare ( a, b ) {
        return semver.compare( a, b );
    }

    constructor ( version ) {
        this.#version = version || "0.0.0";
    }

    get isNull () {
        return this.#version === "0.0.0";
    }

    get isValid () {
        if ( this.#isValid == null ) this.#isValid = semver.valid( this.#version ) != null;

        return this.#isValid;
    }

    get major () {
        if ( this.#major == null ) this.#major = semver.major( this.#version );

        return this.#major;
    }

    get minor () {
        if ( this.#minor == null ) this.#minor = semver.minor( this.#version );

        return this.#minor;
    }

    get patch () {
        if ( this.#patch == null ) this.#patch = semver.patch( this.#version );

        return this.#patch;
    }

    get prerelease () {
        if ( this.#prerelease == null ) this.#prerelease = semver.prerelease( this.#version ) || [];

        return this.#prerelease;
    }

    get isPreRelease () {
        return !!this.prerelease.length;
    }

    // public
    toString () {
        return this.#version;
    }

    getBaseVersion () {
        const version = semver.parse( this.#version );

        if ( !this.isPreRelease ) return new Semver( this.#version );

        return new Semver( `${version.major}.${version.minor}.${version.patch}` );
    }

    compare ( version ) {
        return semver.compare( this.#version, version + "" );
    }

    inc ( type, prereleaseTag ) {
        return new Semver( semver.inc( this.#version, type, prereleaseTag ) );
    }

    gte ( version ) {
        return semver.gte( this.#version, version );
    }
}
