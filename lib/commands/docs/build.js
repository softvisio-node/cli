import Command from "#lib/command";

export default class extends Command {
    static cli () {
        return {};
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find root package` );

        const res = await rootPackage.docs.build();

        if ( !res.ok ) this._exitOnError();
    }
}
