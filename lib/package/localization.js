import glob from "#core/glob";
import PoFile from "#core/locale/po-file";
import path from "node:path";

// import Extract from "#lib/localization/extract";

export default class {
    #pkg;

    constructor ( pkg ) {
        this.#pkg = pkg;
    }

    // public
    async update () {

        // const extract = new Extract();

        const pofiles = glob( "**/*.po", {
            "cwf": this.#pkg.root,
            "directiries": false,
        } );

        for ( const file of pofiles ) {
            const poFile = PoFile.fromFile( file );

            if ( !poFile.sourcesBasePath || !poFile.sourcesInclude.length ) continue;

            // msgcat
            // msgmerge
            // msgcat --force-po -o %s --files-from=%s

            const poPath = path.join( this.#pkg.root, file ),
                basePath = path.resolve( path.dirname( poPath ), poFile.sourcesBasePath );

            const globPatterns = [];

            for ( const include of poFile.sourcesInclude ) {
                globPatterns.push( path.posix.join( path.relative( this.#pkg.root, path.resolve( basePath, include ) ), "**" ).replaceAll( "\\", "/" ) );
            }

            for ( const exclude of poFile.sourcesExclude ) {
                globPatterns.push( "!" + path.posix.join( path.relative( this.#pkg.root, path.resolve( basePath, exclude ) ), "**" ).replaceAll( "\\", "/" ) );
            }

            console.log( globPatterns );
        }

        return result( 200 );
    }
}
