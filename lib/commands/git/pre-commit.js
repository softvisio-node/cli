const Command = require( "../../command" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Git pre-commit hook.",
        };
    }

    async run () {
        const fs = require( "fs" ),
            path = require( "path" ),
            git = this._getGit(),
            util = require( "../../util" ),
            File = require( "../../src/file" );

        if ( !fs.existsSync( "./package.json" ) ) process.exit();

        const pkg = require( path.resolve( ".", "package.json" ) );

        if ( !pkg.lint || !pkg.lint.length ) process.exit();

        var files = Object.fromEntries( util.getFiles( pkg.lint ).map( file => [file, true] ) );

        let changes = await git.run( "diff", "--cached", "--name-only", "--diff-filter=ACM" );

        if ( !changes.ok ) this._throwError( `Unable to get list of staged files.` );

        if ( !changes.data ) process.exit();

        changes = changes.data.split( "\n" ).filter( file => file !== "" );

        let status = 200;

        for ( const fileName of changes ) {
            const fullPath = path.resolve( ".", fileName ).replace( /\\/g, "/" );

            // file is filtered by lint filter
            if ( !files[fullPath] ) continue;

            const content = await git.run( "show", ":" + fileName );

            const res = new File( fileName, content, { "ignoreUnsupported": true } ).run( "lint" );

            // file type is not supported
            if ( res.status === 202 ) continue;

            if ( res.status > status ) status = res.status;

            // TODO if file is modified - write it back to stage index

            // TODO report
            console.log( fileName + ", " + res );
        }

        if ( status >= 300 ) {
            console.log( `Terminated.` );

            process.exit( 2 );
        }
        else {
            console.log( "" );

            process.exit();
        }
    }
};
