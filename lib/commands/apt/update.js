import Command from "#lib/command";
import Apt from "#lib/apt";

export default class extends Command {

    // static
    static cli () {
        return;
    }

    // public
    async run () {
        const root = this._findGitPackage()?.root;

        if ( !root ) return result( [ 500, `Unable to find root package` ] );

        const apt = new Apt( root );

        const res = apt.checkRepository();
        if ( !res.ok ) return res;

        return apt.update();
    }
}
