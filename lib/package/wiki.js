import fs from "@softvisio/core/fs";
import Git from "../git.cjs";

const DOCS_DIR = "docs";

export default class Wiki {
    #rootPackage;
    #git;

    // CONSTRUCTOR
    constructor ( rootPackage ) {
        this.#rootPackage = rootPackage;
    }

    // PROPS
    get rootPackage () {
        return this.#rootPackage;
    }

    get root () {
        return this.rootPackage.root + "/wiki";
    }

    get isExists () {
        return fs.existsSync( this.root );
    }

    get git () {
        if ( !this.#git ) {
            this.#git = new Git( this.root );
        }

        return this.#git;
    }

    // PUBLIC
    async update ( noCommit ) {
        const { confirm } = await import( "@softvisio/core/utils" ),
            { "default": Doc } = await import( "@softvisio/core/doc" );

        process.stdout.write( `Updating wiki ... ` );

        // check wiki exists
        if ( !this.isExists ) return this._error( result( [404, `Wiki wasn't found.`] ) );

        // generate docs
        const doc = new Doc( this.rootPackage.root + "/lib" ),
            tree = await doc.generate();

        // update files
        const dir = this.root + "/" + DOCS_DIR;

        if ( fs.existsSync( dir ) ) fs.rmdirSync( dir, { "recursive": true } );

        tree.write( dir );

        const git = this.git;

        const id = await git.getId();

        if ( !id.ok ) return this._error( result( [400, `Git error.`] ) );

        // wiki files wasn't modified
        if ( !id.data.isDirty ) {
            console.log( "" + result( 304 ) );

            return result( 200 );
        }

        // wiki updated
        else {
            console.log( "" + result( 200 ) );
        }

        if ( noCommit ) return result( 200 );

        // add changes
        process.stdout.write( "Adding wiki changes ... " );
        var res = await git.run( "add", "." );
        if ( !res.ok ) return this._error( res );
        console.log( res + "" );

        // commit
        process.stdout.write( "Commiting wiki ... " );
        res = await git.run( "commit", "-m", `wiki documentation updated` );
        if ( !res.ok ) return this._error( res );
        console.log( res + "" );

        // push
        if ( await git.getUpstream() ) {
            while ( 1 ) {
                process.stdout.write( "Pushing wiki ... " );

                res = await git.run( "push" );

                // push error
                if ( !res.ok ) {
                    console.log( res + "" );

                    if ( ( await confirm( "Repeat?", ["y", "n"] ) ) === "n" ) break;
                }

                // push ok
                else {
                    console.log( res + "" );

                    break;
                }
            }
        }

        return result( 200 );
    }

    _error ( msg ) {
        console.log( msg + "" );

        return msg;
    }
}
