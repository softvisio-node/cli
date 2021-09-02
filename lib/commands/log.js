import Command from "../command.js";
import Changes from "#lib/changes";

export default class extends Command {
    static cli () {
        return {};
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Project root wasn't found.` );

        const git = rootPackage.git,
            id = await git.getId(),
            commits = await git.getLog( id.data.currentVersion );

        console.log( `Changelog since the version: ${id.data.currentVersion.isNull ? "-" : id.data.currentVersion}\n` );

        for ( const commit of commits.data ) {
            console.log( "  - " + commit );
        }

        const changes = new Changes( commits.data );

        if ( commits.data.length ) console.log( "" );
        changes.report();
    }
}
