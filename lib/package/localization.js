import glob from "#core/glob";
import PoFile from "#core/locale/po-file";
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

            if ( !poFile.sourcesBasePath || !poFile.sourcesInclude.length ) continue;

            // XXX msgcat --force-po -o %s --files-from=%s

            const poPath = path.join( this.#pkg.root, file ),
                basePath = path.resolve( path.dirname( poPath ), poFile.sourcesBasePath );

            const globPatterns = [];

            for ( const include of poFile.sourcesInclude ) {
                globPatterns.push( path.posix.join( path.relative( this.#pkg.root, path.resolve( basePath, include ) ), "**" ).replaceAll( "\\", "/" ) );
            }

            for ( const exclude of poFile.sourcesExclude ) {
                globPatterns.push( "!" + path.posix.join( path.relative( this.#pkg.root, path.resolve( basePath, exclude ) ), "**" ).replaceAll( "\\", "/" ) );
            }

            const sources = glob( globPatterns, {
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

                if ( extracted[source] ) extractedMessages.add( extracted[source] );
            }
        }

        console.log( extracted );

        return result( 200 );
    }
}
