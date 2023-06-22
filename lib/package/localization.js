import glob from "#core/glob";
import PoFile from "#core/locale/po-file";

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

            // const globPatterns = [];

            // X-Poedit-Basepath
            // X-Poedit-SearchPath-0
            // X-Poedit-SearchPathExcluded-0
            // msgcat
            // msgmerge

            console.log( file );

            console.log( poFile.toJSON().headers );
        }

        return result( 200 );
    }
}
