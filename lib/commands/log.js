import Command from "../command.cjs";

export default class extends Command {
    static cli () {
        return {
            "summary": "Prints changelog since the latest release.",
        };
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Project root wasn't found.` );

        const git = rootPackage.git,
            id = await git.getId(),
            log = await git.getLog( id.data.currentRelease );

        console.log( `Changelog since release "${id.data.currentRelease || "-"}"\n` );

        for ( const line of log.data ) {
            console.log( "  - " + line );
        }
    }
}
