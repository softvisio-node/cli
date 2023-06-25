import PoFile from "#core/locale/po-file";
import glob from "#core/glob";
import GlobPatterns from "#core/glob/patterns";
import fs from "node:fs";
import path from "node:path";
import Extractor from "#lib/localization/extractor";

export default class {
    #pkg;

    constructor ( pkg ) {
        this.#pkg = pkg;
    }

    // public
    async update () {
        const extracted = {};

        const pofiles = glob( "**/*.po", {
            "cwf": this.#pkg.root,
            "directiries": false,
        } );

        for ( const poFilePath of pofiles ) {
            const absPoFilePath = path.join( this.#pkg.root, poFilePath );

            const poFile = PoFile.fromFile( absPoFilePath );

            if ( !poFile.searchPath ) continue;

            let poFileRoot = path.dirname( absPoFilePath );

            // find po file nearest package
            while ( true ) {
                if ( fs.existsSync( poFileRoot + "/package.json" ) ) break;

                const parent = path.dirname( poFileRoot );
                if ( parent === poFileRoot ) break;
                poFileRoot = parent;
            }

            const extractor = new Extractor( poFileRoot );

            const prefix = path.relative( poFileRoot, path.dirname( absPoFilePath ) ).replaceAll( "\\", "/" );

            const globPatterns = new GlobPatterns();

            for ( const searchPath of poFile.searchPath.split( ":" ) ) {
                globPatterns.add( searchPath, { prefix } );
            }

            const sources = glob( globPatterns.toJSON(), {
                "cwd": poFileRoot,
                "directories": false,
            } );

            extracted[poFileRoot] ??= {};

            const extractedMessages = new PoFile();

            for ( const source of sources ) {
                if ( extracted[poFileRoot][source] == null ) {
                    const res = extractor.extract( source );

                    if ( !res.ok ) return res;

                    extracted[poFileRoot][source] = res.data || false;
                }

                if ( extracted[poFileRoot][source] ) extractedMessages.addMessages( extracted[source] );
            }

            poFile.mergeMessages( extractedMessages );

            fs.writeFileSync( absPoFilePath, poFile.toString() );
        }

        return result( 200 );
    }
}
