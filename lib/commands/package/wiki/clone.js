import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {};
    }

    // public
    async run () {
        const rootPackage = this._findGitPackage();

        if ( !rootPackage ) return result( [ 500, `Unable to find root package` ] );

        const wiki = rootPackage.wiki;

        if ( wiki.isExists ) return result( [ 500, `Wiki is already cloned` ] );

        const git = rootPackage.git;

        const upstream = git.upstream;

        if ( !upstream ) return result( [ 500, `Upstream git repository wasn't found` ] );

        process.stdout.write( `Cloning wiki ... ` );
        const res = await git.run( "clone", "--quiet", upstream.sshWikiCloneUrl, wiki.root );
        if ( !res.ok ) return res;
        console.log( res + "" );
    }
}
