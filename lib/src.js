const _path = require( "path" );
const result = require( "@softvisio/core/result" );
const File = require( "./src/file" );
const utils = require( "./utils" );

module.exports = class Src {
    #cwd;
    #patterns;
    #useIncludePatterns;
    #verbose;
    #reportIgnored;

    constructor ( patterns, options = {} ) {
        this.#cwd = options.cwd;

        this.#patterns = Array.isArray( patterns ) ? patterns : [patterns];

        this.#useIncludePatterns = options.useIncludePatterns;

        this.#verbose = options.verbose;
        this.#reportIgnored = options.reportIgnored;
    }

    async run ( action ) {
        var [cwd, files] = utils.getFiles( this.#patterns, {
            "cwd": this.#cwd,
            "useIncludePatterns": this.#useIncludePatterns,
        } );

        if ( !files.length ) return result( 200 );

        let maxPathLength = 0;

        const report = {
            "total": 0,
            "ignored": 0,
            "processed": 0,
            "modified": 0,
            "ok": 0,
            "warnings": 0,
            "errors": 0,
        };

        files = files.filter( file => {
            report.total++;

            const type = File.getFileType( file );

            if ( !type ) report.ignored++;

            if ( !type && !this.#reportIgnored ) return false;

            if ( file.length > maxPathLength ) maxPathLength = file.length;

            return true;
        } );

        let status = 200;

        for ( const path of files.sort( ( a, b ) => _path.dirname( a ).toLowerCase().localeCompare( _path.dirname( b ).toLowerCase() ) || _path.basename( a ).toLowerCase().localeCompare( _path.basename( b ).toLowerCase() ) ) ) {
            const file = new File( cwd + "/" + path );

            const res = await file.run( action );

            if ( res.status > status ) status = res.status;

            if ( res.ok ) report.ok++;
            else if ( res.is4xx ) report.warnings++;
            else if ( res.is5xx ) report.errors++;

            if ( res.isModified ) report.modified++;
            if ( res.status !== 202 ) report.processed++;

            if ( !this.#verbose ) {
                if ( res.ok && !res.isModified ) continue;
            }

            // skip ignored files
            else if ( !this.#reportIgnored && res.status === 202 ) continue;

            utils.reportFile( path, res, maxPathLength );
        }

        utils.lintReport( report );

        return result( status );
    }
};
