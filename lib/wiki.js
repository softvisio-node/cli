const Command = require( "./command" );
const result = require( "@softvisio/core/result" );
const fs = require( "@softvisio/core/fs" );
const Doc = require( "@softvisio/core/doc" );
const { confirm } = require( "@softvisio/core/util" );

module.exports = class Wiki extends Command {
    #projectRoot;

    constructor ( projectRoot ) {
        super();

        this.#projectRoot = projectRoot;
    }

    async update () {
        process.stdout.write( `Updating wiki ... ` );

        // check wiki root
        const root = this._getWikiRoot();
        if ( !root ) this._throwError( result( [404, `Wiki wasn't found.`] ) );

        // generate docs
        const doc = new Doc( this.#projectRoot + "/lib" ),
            tree = await doc.generate();

        // update files
        if ( fs.existsSync( root + "/docs" ) ) fs.rmdirSync( root + "/docs", { "recursive": true } );

        tree.write( root + "/docs" );

        const git = this._getGit( root );

        const id = await git.getId();

        if ( !id.ok ) this._throwError( result( [400, `Git error.`] ) );

        // wiki files wasn't modofoed
        if ( !id.data.isDirty ) {
            console.log( "" + result( 304 ) );

            return;
        }

        // wiki updated
        else {
            console.log( result( 200 ) );
        }

        // add changes
        process.stdout.write( "Adding wiki changes ... " );
        var res = await git.run( "add", "." );
        if ( !res.ok ) this._throwError( res );
        console.log( res + "" );

        // commit
        process.stdout.write( "Commiting wiki ... " );
        res = await git.run( "commit", "-m", `wiki documentation updated` );
        if ( !res.ok ) this._throwError( res );
        console.log( res + "" );

        // push
        if ( await git.getUpstream() ) {
            while ( 1 ) {
                process.stdout.write( "Pushing wiki ... " );

                res = await git.run( "push" );

                // push error
                if ( !res.ok ) {
                    console.log( res );

                    if ( ( await confirm( "Repeat?", ["y", "n"] ) ) === "n" ) break;
                }

                // push ok
                else {
                    console.log( res + "" );

                    break;
                }
            }
        }
    }

    _getWikiRoot () {
        if ( !fs.existsSync( this.#projectRoot + "/" + "wiki" ) ) {
            return;
        }
        else {
            return this.#projectRoot + "/" + "wiki";
        }
    }
};
