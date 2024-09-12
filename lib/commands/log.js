import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {};
    }

    async run () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find root package` ] );

        const git = pkg.git,
            status = await git.getStatus(),
            changes = ( await git.getChanges( status.data.currentVersion ) ).data;

        console.log( `Changelog since the version: ${ status.data.currentVersion.isNull
            ? "-"
            : status.data.currentVersion }\n` );

        for ( const commit of changes.changes ) {
            console.log( "-   " + commit.subject );
        }

        if ( changes.changes.length ) console.log( "" );
        changes.report();
    }
}
