import Command from "#lib/command";

export default class extends Command {
    static cli () {
        return {};
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find root package` );

        const wiki = rootPackage.wiki;

        if ( wiki.isExists ) this._throwError( `Wiki is already cloned` );

        const git = rootPackage.git;

        const upstream = git.upstream;

        if ( !upstream ) this._throwError( `Upstream git repository wasn't found` );

        process.stdout.write( `Cloning wiki ... ` );
        const res = await git.run( "clone", "--quiet", upstream.sshWikiCloneUrl, wiki.root );
        if ( !res.ok ) this._throwError( res );
        console.log( res + "" );
    }
}
