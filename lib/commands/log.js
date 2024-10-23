import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {};
    }

    // public
    async run () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find root package` ] );

        const git = pkg.git,
            status = await git.getStatus(),
            { "data": changes } = await git.getChanges( status.data.currentVersion );

        console.log( `Changelog since the version: ${ status.data.currentVersion.isNull
            ? "-"
            : status.data.currentVersion }\n` );

        for ( const commit of changes.changes ) {
            console.log( "-   " + commit.title );
        }

        if ( changes.changes.length ) console.log( "" );
        changes.report();
    }
}
