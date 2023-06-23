import PoFile from "#core/locale/po-file";
import glob from "#core/glob";
import GlobPatterns from "#core/glob/patterns";
import fs from "node:fs";
import path from "node:path";
import Extract from "#lib/localization/extract";

export default class {
    #pkg;

    constructor ( pkg ) {
        this.#pkg = pkg;
    }

    // public
    async update () {
        const extract = new Extract(),
            extracted = {};

        const pofiles = glob( "**/*.po", {
            "cwf": this.#pkg.root,
            "directiries": false,
        } );

        for ( const file of pofiles ) {
            const poFile = PoFile.fromFile( file );

            if ( !poFile.searchPath ) continue;

            const poPath = path.join( this.#pkg.root, file ),
                prefix = path.relative( this.#pkg.root, path.dirname( poPath ) ).replaceAll( "\\", "/" );

            const globPatterns = new GlobPatterns();

            for ( const searchPath of poFile.searchPath.split( ":" ) ) {
                globPatterns.add( searchPath, { prefix } );
            }

            const sources = glob( globPatterns.toJSON(), {
                "cwd": this.#pkg.root,
                "directories": false,
            } );

            const extractedMessages = new PoFile();

            for ( const source of sources ) {
                if ( extracted[source] == null ) {
                    const res = extract.extract( path.posix.join( this.#pkg.root, source ) );

                    if ( !res.ok ) return res;

                    extracted[source] = res.data || false;
                }

                if ( extracted[source] ) extractedMessages.addMessages( extracted[source] );
            }

            poFile.mergeMessages( extractedMessages );

            console.log( "----------------------------------------------" );
            console.log( file );
            console.log( poFile + "" );
            process.exit();

            fs.writeFileSync( poPath, poFile.toString() );
        }

        return result( 200 );
    }
}
