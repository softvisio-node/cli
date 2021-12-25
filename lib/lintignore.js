import fs from "fs";
import path from "path";
import { quoteMeta } from "#core/utils";

// NOTE https://git-scm.com/docs/gitignore

export default class LintIgnore {
    #root;

    #lintIgnoreDirCache = {};
    #patternsCache = {};

    constructor ( root ) {
        this.#root = root;
    }

    // public
    filter ( files ) {
        const filteredFiles = [];

        for ( const file of files ) {
            const absFile = path.resolve( this.#root, file ).replaceAll( "\\", "/" );

            const lintIgnores = this.#getLintIgnores( absFile );

            if ( this.#filter( absFile, lintIgnores ) ) filteredFiles.push( file );
        }

        return filteredFiles;
    }

    // private
    #getLintIgnores ( file ) {
        const dirname = path.dirname( file );

        if ( !this.#lintIgnoreDirCache[dirname] ) {
            const lintIgnore = [];

            let _path = dirname;

            while ( 1 ) {

                // directory already cached
                if ( this.#lintIgnoreDirCache[_path] ) {
                    lintIgnore.unshift( ...this.#lintIgnoreDirCache[_path] );

                    break;
                }

                if ( fs.existsSync( _path + "/.lintignore" ) ) lintIgnore.unshift( _path + "/.lintignore" );

                // stop at package root
                // if ( fs.existsSync( _path + "/package.json" ) ) break;

                // stop at git root
                if ( fs.existsSync( _path + "/.git" ) ) break;

                const parent = path.dirname( _path );

                // fs root
                if ( _path === parent ) break;

                _path = parent;
            }

            this.#lintIgnoreDirCache[dirname] = lintIgnore;
        }

        // console.log( file, this.#lintIgnoreDirCache[dirname] );

        return this.#lintIgnoreDirCache[dirname];
    }

    #filter ( file, lintIgnores ) {
        if ( !lintIgnores.length ) return true;

        for ( const lintIgnore of lintIgnores ) {
            const patterns = this.#getPatterns( lintIgnore );

            // get path related to lintignore location
            const relPath = path.relative( path.dirname( lintIgnore ), file ).replaceAll( "\\", "/" );

            let ignore = false;

            for ( const [include, pattern] of patterns ) {
                if ( pattern.test( relPath ) ) {
                    if ( include ) ignore = false;
                    else ignore = true;
                }
            }

            if ( ignore ) return false;
        }

        return true;
    }

    #getPatterns ( lintIgnore ) {
        if ( !this.#patternsCache[lintIgnore] ) {
            this.#patternsCache[lintIgnore] = [];

            const patterns = fs
                .readFileSync( lintIgnore )
                .toString()
                .split( /\r?\n/ )
                .map( pattern => pattern.trim() )
                .filter( pattern => !!pattern && !pattern.startsWith( "#" ) );

            for ( let pattern of patterns ) {
                let include = false,
                    re = "";

                // An optional prefix "!" which negates the pattern;
                // any matching file excluded by a previous pattern will become included again.
                if ( pattern.startsWith( "!" ) ) {
                    include = true;

                    pattern = pattern.substr( 1 );
                }

                // If there is a separator at the beginning or middle (or both) of the pattern,
                // then the pattern is relative to the directory level of the particular .gitignore file itself.
                // Otherwise the pattern may also match at any level below the
                if ( pattern.includes( "/" ) ) {
                    re += "^";

                    if ( pattern.startsWith( "/" ) ) pattern = pattern.substr( 1 );
                }

                re += quoteMeta( pattern )
                    .split( "\\*\\*" )
                    .map( pattern => pattern.replaceAll( "\\*", "[^\\/]*?" ).replaceAll( "\\?", "[^/]" ) )
                    .join( ".*?" );

                re = new RegExp( re );

                this.#patternsCache[lintIgnore].push( [include, re] );
            }
        }

        return this.#patternsCache[lintIgnore];
    }
}
