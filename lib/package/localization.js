import PoFile from "#core/locale/po-file";
import glob from "#core/glob";
import GlobPatterns from "#core/glob/patterns";
import fs from "node:fs";
import path from "node:path";
import GetText from "#lib/get-text";
import sql from "#core/sql";
import env from "#core/env";
import url from "node:url";
import CloudTranslationApi from "#core/api/google/cloud/translation";
import * as utils from "#core/utils";

env.loadUserEnv();

if ( process.env.GCLOUD_TRANSLATION_API_KEY ) {
    var cloudTranslationApi = new CloudTranslationApi( process.env.GCLOUD_TRANSLATION_API_KEY );
}

const SQL = {
    "schema": sql`
CREATE TABLE IF NOT EXISTS translation (
    language text NOT NULL,
    msgid text NOT NULL,
    msgid_plural text NOT NULL,
    translations json NOT NULL,
    PRIMARY KEY ( language, msgid, msgid_plural )
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

            status[ poFilePath ] = poFile.isTranslated;

            if ( !status[ poFilePath ] ) isTranslated = false;
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

                if ( extracted[ key ] == null ) {
                    const res = new GetText( {
                        "absolutePath": souceAbsPath,
                        "packageRelativePath": source,
                        "relativePath": sourceRelPath,
                    } ).extract();

                    if ( !res.ok ) {
                        console.log( res + "" );

                        return res;
                    }

                    extracted[ key ] = res.data || false;
                }

                if ( extracted[ key ] ) {
                    extractedMessages.addMessages( extracted[ key ] );
                }
            }

            poFile.mergeExtractedMessages( extractedMessages );

            // update translation memory
            if ( poFile.messages ) {
                for ( const message of Object.values( poFile.messages ) ) {
                    if ( message.isDisabled ) continue;

                    // delete invalid translation
                    if ( message.id === message.translations?.[ 0 ] ) {
                        console.warn( `Failed translation removed:
- [en]: ${ message.id }
- [${ poFile.language }]: ${ message.translations[ 0 ] }
` );

                        message.isFuzzy = false;
                        message.setTranslations( null );
                    }

                    const translatedMessage = this.#dbh.selectRow( SQL.getTranslations, [

                        //
                        poFile.language,
                        message.id,
                        message.pluralId || "",
                    ] ).data;

                    // message is fully translated
                    if ( message.isTranslated && !message.isFuzzy ) {
                        if ( translatedMessage ) {
                            const translatedMessageHash = JSON.stringify( translatedMessage.translations ),
                                messageHash = JSON.stringify( message.translations );

                            // translation memory conflict
                            if ( translatedMessageHash !== messageHash ) {
                                console.log( `Translation memory conflict found:
- [en]: ${ message.id }
- [en]: ${ message.pluralId || "-" }

- [${ poFile.language }]: OLD TRANSLATIONS:
${ JSON.stringify( translatedMessage.translations, null, 4 ) }

- [${ poFile.language }]: NEW TRANSLATIONS:
${ JSON.stringify( message.translations, null, 4 ) }
` );

                                const choise = await utils.confirm( "What translations do you want to use?", [ "n", "o" ] );

                                if ( choise === "n" ) {
                                    this.#storeMessage( poFile.language, message );
                                }
                                else {
                                    message.setTranslations( translatedMessage.translations );
                                }
                            }
                        }

                        // store to the translatuin memory
                        else {
                            this.#storeMessage( poFile.language, message );
                        }
                    }

                    // message is not translated
                    else {

                        // get message from the translation memory
                        if ( translatedMessage ) {
                            message.isFuzzy = false;
                            message.setTranslations( translatedMessage.translations );
                        }

                        // pre-translate single form
                        else if ( cloudTranslationApi && !message.translations?.[ 0 ] ) {
                            const res = await cloudTranslationApi.translate( poFile.language, message.id );

                            // error
                            if ( !res.ok ) {
                                console.warn( `Cloud translation API error:`, res + "" );

                                continue;
                            }

                            // not translated
                            else if ( !res.data || res.data === message.id ) {
                                console.warn( `Cloud translation failed:
- [en]: ${ message.id }
- [${ poFile.language }]: -
` );

                                continue;
                            }

                            // translated from clous
                            else {
                                message.isFuzzy = true;

                                const translations = message.translations || [];
                                translations[ 0 ] = res.data;

                                message.setTranslations( translations );

                                console.log( `Cloud translation:
- [en]: ${ message.id }
- [${ poFile.language }]: ${ res.data }
` );
                            }
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

    #storeMessage ( language, message ) {
        this.#dbh.do( SQL.updateTranslations, [

            //
            language,
            message.id,
            message.pluralId || "",
            message.translations,
        ] );
    }
}
