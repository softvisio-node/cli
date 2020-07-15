const result = require( "@softvisio/core/result" );
const fs = require( "@softvisio/core/fs" );
const Git = require( "./git" );
const Doc = require( "@softvisio/core/doc" );

module.exports = class Wiki {
    #projectRoot;

    constructor ( projectRoot ) {
        this.#projectRoot = projectRoot;
    }

    async update () {}

    getWikiRoot () {
        if ( !fs.existsSync( this.#projectRoot + "/" + "wiki" ) ) {
            return;
        }
        else {
            return this.#projectRoot + "/" + "wiki";
        }
    }

    getCanCommit () {
        const root = this.getWikiRoot();

        if ( !root ) return;

        if ( fs.existsSync( root + "/.git" ) ) return true;

        return;
    }

    async gitCommit ( message ) {
        if ( !this.canCommit() ) return result( 404 );

        const git = new Git( this.getWikiRoot() );

        var res = await git.run( "add", "." );
        if ( !res.ok ) return res;

        res = await git.run( "commit", "-m", message || "auto commit", "-a" );
        if ( !res.ok ) return res;

        return result( 200 );
    }

    async gitPush () {
        if ( !this.canCommit() ) return result( 404 );

        const git = new Git( this.getWikiRoot() );

        if ( !( await git.getUpstream() ) ) return result( [400, "No upstream repository"] );

        var res = await git.run( "push" );
        if ( !res.ok ) return res;

        return result( 200 );
    }

    async generate () {
        const doc = new Doc( this.#projectRoot + "/lib" ),
            tree = await doc.generate();

        console.log( tree );

        // out = "./wiki/docs",
        // if ( fs.existsSync( "./wiki/docs" ) ) fs.rmdirSync( out, { "recursive": true } );

        // tree.write( "./wiki/docs" );
    }
};
