import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {};
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Project root wasn't found.` );

        const git = rootPackage.git,
            id = await git.getId(),
            changes = ( await git.getChanges( id.data.currentVersion ) ).data;

        console.log( `Changelog since the version: ${id.data.currentVersion.isNull ? "-" : id.data.currentVersion}\n` );

        for ( const commit of changes.changes ) {
            console.log( "-   " + commit.raw );
        }

        if ( changes.changes.length ) console.log( "" );
        changes.report();
    }
}
