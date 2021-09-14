import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {};
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Project root wasn't found.` );

        const git = rootPackage.git,
            state = await git.getState(),
            changes = ( await git.getChanges( state.data.currentVersion ) ).data;

        console.log( `Changelog since the version: ${state.data.currentVersion.isNull ? "-" : state.data.currentVersion}\n` );

        for ( const commit of changes.changes ) {
            console.log( "-   " + commit.message );
        }

        if ( changes.changes.length ) console.log( "" );
        changes.report();
    }
}
