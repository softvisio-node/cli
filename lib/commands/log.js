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
            commits = await git.getLog( id.data.currentVersion ),
            changes = new Changes( commits.data );

        console.log( `Changelog since the version: ${id.data.currentVersion.isNull ? "-" : id.data.currentVersion}\n` );

        for ( const commit of changes.changes ) {
            console.log( "-   " + commit.raw );
        }

        if ( changes.changes.length ) console.log( "" );
        changes.report();
    }
}
