import Command from "#lib/command";
import { ansi } from "#core/text";
import glob from "#core/glob";

export default class extends Command {
    static cli () {
        return {};
    }

    // public
    async run () {
        var packages;

        const rootPackage = this._findRootPackage();

        if ( rootPackage ) {
            packages = [ rootPackage ];
        }
        else {
            const files = glob( "**/*.po" ),
                idx = {};

            for ( const file of files ) {
                const pkg = this._findNearestPackage( file );

                if ( !pkg ) continue;

                idx[ pkg.root ] = pkg;
            }

            packages = Object.values( idx );
        }

        for ( let n = 0; n < packages.length; n++ ) {
            const pkg = packages[ n ];

            if ( n ) console.log( "" );

            console.log( `Package: ${ pkg.name }\n` );

            const res = await pkg.localization.update();

            if ( !res.ok ) this._exitOnError();

            const localizationStatus = pkg.localization.status();

            if ( localizationStatus.data ) {
                for ( const [ poFilePath, isTranslated ] of Object.entries( localizationStatus.data ) ) {
                    console.log( isTranslated ? " OK    " : ansi.error( " FUZZY " ), poFilePath );
                }
            }
        }
    }
}
