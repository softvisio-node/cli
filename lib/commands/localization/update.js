import Command from "#lib/command";
import { ansi } from "#core/text";

export default class extends Command {
    static cli () {
        return {};
    }

    // public
    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find root package` );

        const res = await rootPackage.localization.update();

        if ( !res.ok ) this._exitOnError();

        const localizationStatus = rootPackage.localization.status();

        if ( localizationStatus.data ) {
            console.log( "Localization status:\n" );

            for ( const [ poFilePath, isTranslated ] of Object.entries( localizationStatus.data ) ) {
                console.log( isTranslated ? " OK    " : ansi.error( " FUZZY " ), poFilePath );
            }
        }
    }
}
