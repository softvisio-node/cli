import PoFile from "#core/locale/po-file";
import glob from "#core/glob";
import GlobPatterns from "#core/glob/patterns";
import fs from "node:fs";
import path from "node:path";
import GetText from "#lib/get-text";
import sql from "#core/sql";
import env from "#core/env";
import url from "node:url";

export default class {
    #pkg;
    #dbh;

    constructor ( pkg ) {
        this.#pkg = pkg;
    }

    // public
    status () {
        var status;

        const poFiles = glob( "**/*.po", {
            "cwd": this.#pkg.root,
            "directiries": false,
        } );

        var isTranslated = true;

        for ( const poFilePath of poFiles ) {
            status ??= {};

            const absPoFilePath = path.join( this.#pkg.root, poFilePath );

            const poFile = PoFile.fromFile( absPoFilePath );

            status[poFilePath] = poFile.isTranslated;

            if ( !status[poFilePath] ) isTranslated = false;
        }

        return result( isTranslated ? 200 : 500, status );
    }

    async update () {
        await this.#initTranslationMemory();

        const extracted = {};

        const poFiles = glob( "**/*.po", {
            "cwd": this.#pkg.root,
            "directiries": false,
        } );

        for ( const poFilePath of poFiles ) {
            const absPoFilePath = path.join( this.#pkg.root, poFilePath );

            const poFile = PoFile.fromFile( absPoFilePath );

            if ( !poFile.searchPath ) continue;

            let poFileRoot = path.dirname( absPoFilePath );

            // find po file nearest package
            while ( true ) {
                if ( fs.existsSync( poFileRoot + "/package.json" ) ) break;

                const parent = path.dirname( poFileRoot );
                if ( parent === poFileRoot ) break;
                poFileRoot = parent;
            }

            const getText = new GetText( poFileRoot );

            const prefix = path.relative( poFileRoot, path.dirname( absPoFilePath ) ).replaceAll( "\\", "/" );

            const globPatterns = new GlobPatterns();

            for ( let searchPath of poFile.searchPath.split( ":" ) ) {
                if ( !searchPath.startsWith( "/" ) ) searchPath = prefix + "/" + searchPath;

                globPatterns.add( searchPath );
            }

            const sources = glob( globPatterns.toJSON(), {
                "cwd": poFileRoot,
                "directories": false,
            } );

            extracted[poFileRoot] ??= {};

            const extractedMessages = new PoFile();

            for ( const source of sources ) {
                if ( extracted[poFileRoot][source] == null ) {
                    const res = getText.extract( source );

                    if ( !res.ok ) return res;

                    extracted[poFileRoot][source] = res.data || false;
                }

                if ( extracted[poFileRoot][source] ) extractedMessages.addMessages( extracted[poFileRoot][source] );
            }

            poFile.mergeMessages( extractedMessages );

            fs.writeFileSync( absPoFilePath, poFile.toString() );
        }

        return result( 200 );
    }

    // private
    async #initTranslationMemory () {
        const location = url.pathToFileURL( env.getXdgDataDir( "softvisio-cli/translation-memory.sqlite" ) );

        if ( !fs.existsSync( path.dirname( url.fileURLToPath( location ) ) ) ) {
            fs.mkdirSync( path.dirname( url.fileURLToPath( location ) ), {
                "recursive": true,
            } );
        }

        this.#dbh = await sql.new( location );

        this.#dbh.exec( sql`
CREATE TABLE IF NOT EXISTS translation (
    language text NOY NULL,
    msgid text NOT NULL,
    msgid_plural text NOT NULL,
    PRIMARY KEY ( language, msgid, msgid_plural )
);
` );
    }
}
