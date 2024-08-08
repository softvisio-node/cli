import Command from "#lib/command";

export default class extends Command {
    static cli () {
        return {};
    }

    async run () {
        const rootPackage = this._findGitPackage();

        if ( !rootPackage ) return result( [ 500, `Unable to find root package` ] );

        const res = await rootPackage.docs.init();

        return res;
    }
}
