import PoFile from "#core/locale/po-file";
import glob from "#core/glob";
import GlobPatterns from "#core/glob/patterns";
import fs from "node:fs";
import path from "node:path";
import GetText from "#lib/get-text";
import sql from "#core/sql";
import env from "#core/env";
import url from "node:url";

const SQL = {
    "schema": sql`
create table if not exists translation (
    language text noy null,
    msgid text not null,
    msgid_plural text not null,
    translations json not null,
    primary key ( language, msgid, msgid_plural )
);
`,

    "updateTranslations": sql`
INSERT INTO translation
    (
        language,
        msgid,
        msgid_plural,
        translations
    )
VALUES
    ( ?, ?, ?, ? )
ON CONFLICT ( language, msgid, msgid_plural ) DO UPDATE SET
    translations = EXCLUDED.translations
`.prepare(),

    "getTranslations": sql`SELECT translations FROM translation WHERE language = ? AND msgid = ? AND msgid_plural = ?`.prepare(),
};

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

            // .po file package root
            let poFilePackageRoot = path.dirname( absPoFilePath );

            // find po file nearest package
            while ( true ) {
                if ( fs.existsSync( poFilePackageRoot + "/package.json" ) ) break;

                const parent = path.dirname( poFilePackageRoot );
                if ( parent === poFilePackageRoot ) break;
                poFilePackageRoot = parent;
            }

            const getText = new GetText();

            const prefix = path.relative( poFilePackageRoot, path.dirname( absPoFilePath ) ).replaceAll( "\\", "/" );

            const globPatterns = new GlobPatterns();

            for ( let searchPath of poFile.searchPath.split( ":" ) ) {
                if ( !searchPath.startsWith( "/" ) ) searchPath = prefix + "/" + searchPath;

                globPatterns.add( searchPath );
            }

            const sources = glob( globPatterns.toJSON(), {
                "cwd": poFilePackageRoot,
                "directories": false,
            } );

            const extractedMessages = new PoFile();

            for ( const source of sources ) {
                const souceAbsPath = path.join( poFilePackageRoot, source ),
                    sourceRelPath = path.relative( path.dirname( absPoFilePath ), souceAbsPath ).replaceAll( "\\", "/" ),
                    key = souceAbsPath + "/" + sourceRelPath;

                if ( extracted[key] == null ) {
                    const res = getText.extract( souceAbsPath, sourceRelPath );

                    if ( !res.ok ) return res;

                    extracted[key] = res.data || false;
                }

                if ( extracted[key] ) {
                    extractedMessages.addMessages( extracted[key] );
                }
            }

            poFile.mergeExtractedMessages( extractedMessages );

            // update translation memory
            if ( poFile.messages ) {
                for ( const message of Object.values( poFile.messages ) ) {
                    if ( message.isDisabled ) continue;

                    if ( message.isDisFuzzy ) continue;

                    if ( message.isTranslated ) {
                        this.#dbh.do( SQL.updateTranslations, [

                            //
                            poFile.language,
                            message.id,
                            message.pluralId || "",
                            message.translations,
                        ] );
                    }
                    else {
                        const res = this.#dbh.selectRow( SQL.getTranslations, [

                            //
                            poFile.language,
                            message.id,
                            message.pluralId || "",
                        ] );

                        if ( res.data ) {
                            message.isFuzzy = true;
                            message.setTranslations( res.data.translations );
                        }
                    }
                }
            }

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

        this.#dbh.exec( SQL.schema );
    }
}
