import ansi from "#core/ansi";
import { glob } from "#core/glob";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {};
    }

    // public
    async run () {
        var packages;

        const gitPkg = this._findGitPackage();

        if ( gitPkg ) {
            packages = [ gitPkg ];
        }
        else {
            const files = await glob( "**/*.po" ),
                idx = {};

            for ( const file of files ) {
                const pkg = this._findPackage( file );

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

            if ( !res.ok ) return res;

            const localizationStatus = pkg.localization.status();

            if ( localizationStatus.data ) {
                for ( const [ poFilePath, isTranslated ] of Object.entries( localizationStatus.data ) ) {
                    console.log( isTranslated
                        ? " OK    "
                        : ansi.error( " FUZZY " ), poFilePath );
                }
            }
        }
    }
}
