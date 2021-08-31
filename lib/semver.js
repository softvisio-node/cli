import semver from "semver";

const DEFAULT_VERSION = "0.0.0";

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

    toJSON () {
        return this.#range;
    }

    get isPreRelease () {
        if ( this.#isPreRelease == null ) this.#isPreRelease = !!semver.minVersion( this.#range ).prerelease.length;

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

    static get Range () {
        return Range;
    }

    static compare ( a, b ) {
        return semver.compare( a, b );
    }

    constructor ( version ) {
        if ( !version ) this.#version = DEFAULT_VERSION;
        else if ( version.startsWith( "v" ) ) this.#version = version.substr( 1 );
        else this.#version = version;
    }

    get isNull () {
        return this.#version === DEFAULT_VERSION;
    }

    get isValid () {
        if ( this.#isValid == null ) this.#isValid = semver.valid( this.#version ) != null;

        return this.#isValid;
    }

    get isMajor () {
        return this.major && !this.minor && !this.patch;
    }

    get isMinor () {
        return this.minor && !this.patch;
    }

    get isPatch () {
        return !!this.patch;
    }

    get isPreRelease () {
        return !!this.preRelease.length;
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

    get preRelease () {
        if ( this.#prerelease == null ) this.#prerelease = semver.prerelease( this.#version ) || [];

        return this.#prerelease;
    }

    // public
    toString () {
        return this.#version;
    }

    toVersionString () {
        return "v" + this.#version;
    }

    toJSON () {
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
        var version;

        if ( type === "prerelease" ) {
            version = new Semver( semver.inc( this.#version, type, prereleaseTag ) );
        }
        else {
            version = new Semver( semver.inc( this.#version, type ) );

            if ( prereleaseTag ) version = new Semver( semver.inc( this.#version, "prerelease", prereleaseTag ) );
        }

        return version;
    }

    gte ( version ) {
        return semver.gte( this.#version, version + "" );
    }
}
