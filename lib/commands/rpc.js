import Command from "#lib/command";
import stream from "#core/stream";
import msgpack from "#core/msgpack";
import * as msgPackStream from "#core/stream/msgpack";
import net from "node:net";
import url from "node:url";
import LintFile from "#lib/lint/file";
import File from "#core/file";
import fs from "node:fs";
import { TmpFile } from "#core/tmp";
import Browser from "#core/browser";
import path from "node:path";

const PORT = 55555;

export default class extends Command {

    // static
    static cli () {
        return {
            "description": "Start RPC server on address 127.0.0.1:55555.",
        };
    }

    // public
    async run () {
        var server = net.createServer( socket => {
            const decoder = new msgPackStream.Decode();

            decoder.on( "data", async msg => {
                try {
                    const res = await this[ "API_" + msg[ 2 ] ]( ...msg[ 3 ] );

                    socket.write( msgpack.encode( [ 1, msg[ 1 ], null, res ] ) );
                }
                catch ( e ) {
                    console.log( e );

                    socket.write( msgpack.encode( [ 1, msg[ 1 ], "error", null ] ) );
                }
            } );

            stream.pipeline( socket, decoder, () => {} );
        } );

        return new Promise( resolve => {
            server.on( "error", e => {
                resolve( result.catch( e ) );
            } );

            server.listen( PORT, "127.0.0.1" );
        } );
    }

    async API_browserPrint ( data ) {
        if ( process.platform !== "win32" ) return;

        data.data.replaceAll( "\t", "    " );
        data.data.replaceAll( "&", "&amp;" );
        data.data.replaceAll( "<", "&lt;" );
        data.data.replaceAll( ">", "&gt;" );
        data.data.replaceAll( `"`, "&quot;" );
        data.data.replaceAll( `'`, "&#39;" );

        if ( data.font ) data.font = data.font.split( ":" )[ 0 ].replaceAll( "_", " " );

        const html = `
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=${ data.encoding }">
</head>
<body>
<pre style="font-family: '${ data.font }' !important; font-size: 12pt; white-space: pre-wrap;">
${ data.data }
</pre>
</body>
</html>
        `;

        const tmp = new TmpFile( { "extname": ".html" } );

        fs.writeFileSync( tmp.path, html );

        new Browser( url.pathToFileURL( tmp.path ), { "defaultBrowser": true, "detached": true } );

        return result( 200 );
    }

    async API_lint ( data ) {
        if ( data.path == null || data.path === "" ) data.path = "temp";

        const file = new File( {
            "path": path.isAbsolute( data.path ) ? data.path : path.join( data.cwd, data.path ),
            "type": data.type,
            "buffer": data.buffer,
        } );

        return new LintFile( file, { "processUnsupported": true } ).run( data.action );
    }
}
