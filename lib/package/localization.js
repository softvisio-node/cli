import glob from "#core/glob";
import PoFile from "#core/locale/po-file";

export default class {
    #pkg;

    constructor ( pkg ) {
        this.#pkg = pkg;
    }

    // public
    async update () {
        const files = glob( "**/*.po", {
            "cwf": this.#pkg.root,
            "directiries": false,
        } );

        for ( const file of files ) {
            const poFile = PoFile.fromFile( file );

            // X-Poedit-Basepath
            // X-Poedit-SearchPath-0
            // X-Poedit-SearchPathExcluded-0

            console.log( poFile.toJSON() );
        }

        return result( 200 );
    }
}
