import Command from "#lib/command";
import Extractor from "#lib/localization/extractor";
import PoFile from "#core/locale/po-file";
import fs from "node:fs";

export default class extends Command {
    static cli () {
        return {
            "description": `PoEdit extractor settings:
    Extensions: *.js;*.mjs;*.cjs;*.vue
    Command: cmd /C "softvisio-cli.cmd localization gettext --output %o %F"
    File: %f
`,
            "options": {
                "output": {
                    "description": "output file path",
                    "schema": { "type": "string" },
                },
            },
            "arguments": {
                "files": {
                    "description": "input files paths",
                    "schema": { "type": "array", "item": { "type": "string" }, "minItems": 1 },
                },
            },
        };
    }

    async run () {
        const poFile = new PoFile();

        const extractor = new Extractor();

        for ( const file of process.cli.arguments.files ) {
            const res = extractor.extract( file );

            if ( !res.ok ) this._throwError( res.statusText );

            if ( !res.data ) this._throwError( `File type not supported: "${file}"` );

            poFile.addMessages( res.data );
        }

        if ( process.cli.options.output ) {
            fs.writeFileSync( process.cli.options.output, poFile + "" );
        }
        else {
            console.log( poFile + "" );
        }
    }
}
