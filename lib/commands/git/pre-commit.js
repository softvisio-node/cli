const Command = require( "../../command" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Git pre-commit hook.",
        };
    }

    async run () {
        const fs = require( "fs" ),
            util = require( "../../util" ),
            git = this._getGit(),
            File = require( "../../src/file" );

        if ( !this._isProjectRoot( "." ) ) process.exit();

        // get list of staged files
        let staged = await git.run( "diff", "--cached", "--name-only", "--diff-filter=ACM" );
        if ( !staged.ok ) this._throwError( `Unable to get list of staged files.` );
        if ( !staged.data ) process.exit();
        staged = staged.data.split( "\n" ).filter( file => file !== "" );

        staged = this._filterFiles( ".", staged );

        if ( !staged.length ) process.exit();

        // get list of modified files
        let modified = await git.run( "diff", "--name-only", "--diff-filter=ACM" );
        if ( !modified.ok ) this._throwError( `Unable to get list of modified files.` );
        modified = Object.fromEntries( modified.data
            .split( "\n" )
            .filter( file => file !== "" )
            .map( file => [file, true] ) );

        let maxPathLength = 0;

        // find max path length for report
        for ( const fileName of staged ) {
            if ( fileName.length > maxPathLength ) maxPathLength = fileName.length;
        }

        let status = 200;

        for ( const fileName of staged ) {

            // get staged file content
            const content = await git.run( "show", ":" + fileName );

            const res = new File( fileName, { "data": content.data } ).run( "lint" );

            // file type is not supported
            if ( res.status === 202 ) continue;

            if ( res.status > status ) status = res.status;

            // file was modified
            if ( res.isModified ) {

                // create git object
                const hash = await git.createObject( res.data );
                if ( !hash.ok || !hash.data ) this._throwError( `Unable to create git object.` );

                // update git staging index
                const res1 = await git.run( "update-index", "--add", "--cacheinfo", "100644", hash.data, fileName );
                if ( !res1.ok ) this._throwError( `Unable to update git index.` );

                // update working tree, if file wasn't modified after add and wasn't removed
                if ( !modified[fileName] && fs.existsSync( fileName ) ) fs.writeFileSync( fileName, res.data );
            }

            // report
            util.reportFile( fileName, res, maxPathLength );
        }

        if ( status >= 300 ) {
            console.log( `\nLinter reported errors in staged files. Commit terminated.` );

            process.exit( 1 );
        }
        else {
            console.log( "" );

            process.exit();
        }
    }

    _filterFiles ( root, staged ) {
        const { Minimatch } = require( "minimatch" ),
            path = require( "path" );

        if ( root === "" ) root = ".";

        // read root package.json
        var rootLint;
        const pkg = require( path.resolve( ".", root + "/package.json" ) );
        if ( pkg.lint ) rootLint = pkg.lint.map( pattern => new Minimatch( pattern, { "dot": true } ) );

        // read sub-projects
        const subProjectsLint = {};
        const subProjects = this._getSubProjects( root );
        for ( const subProjectRoot of subProjects ) {
            const pkg = require( path.resolve( ".", root + "/" + subProjectRoot + "/package.json" ) );
            if ( pkg.lint ) subProjectsLint[subProjectRoot] = pkg.lint.map( pattern => new Minimatch( subProjectRoot + "/" + pattern, { "dot": true } ) );
        }

        staged = staged.filter( path => {
            for ( const subProjectRoot in subProjectsLint ) {
                if ( path.indexOf( subProjectRoot + "/" ) === 0 ) {
                    if ( !subProjectsLint[subProjectRoot] ) return false;

                    for ( const pattern of subProjectsLint[subProjectRoot] ) {
                        if ( pattern.match( path ) ) return true;
                    }

                    return false;
                }
            }

            if ( !rootLint ) return false;

            for ( const pattern of rootLint ) {
                if ( pattern.match( path ) ) return true;
            }

            return false;
        } );

        return staged;
    }
};
