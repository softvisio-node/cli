import Command from "../command.js";
import stream from "#core/stream";
import msgpack from "#core/msgpack";
import StreamMsgPack from "#core/stream/msgpack";
import net from "net";
import url from "url";
import LintFile from "#lib/lint/file";
import File from "#core/file";
import fs from "fs";
import childProcess from "child_process";
import { TmpFile } from "#core/tmp";

const PORT = 55555;
const EXIT_CODE_ON_ERROR = 3;

export default class extends Command {
    static cli () {
        return {
            "description": "Start RPC server on address 127.0.0.1:55555.",
        };
    }

    async run () {
        var server = net.createServer( socket => {
            const decoder = new StreamMsgPack();

            decoder.on( "data", async msg => {
                try {
                    const res = await this["API_" + msg[2]]( ...msg[3] );

                    socket.write( msgpack.encode( [1, msg[1], null, res] ) );
                }
                catch ( e ) {
                    console.log( e );

                    socket.write( msgpack.encode( [1, msg[1], "error", null] ) );
                }
            } );

            stream.pipeline( socket, decoder, () => {} );
        } );

        server.on( "error", e => {
            console.log( e + "" );

            process.exit( EXIT_CODE_ON_ERROR );
        } );

        await server.listen( PORT, "127.0.0.1" );
    }

    async API_browserPrint ( data ) {
        if ( process.platform !== "win32" ) return;

        data.data.replaceAll( "\t", "    " );
        data.data.replaceAll( "&", "&amp;" );
        data.data.replaceAll( "<", "&lt;" );
        data.data.replaceAll( ">", "&gt;" );
        data.data.replaceAll( `"`, "&quot;" );
        data.data.replaceAll( `'`, "&#39;" );

        if ( data.font ) data.font = data.font.split( ":" )[0].replaceAll( "_", " " );

        const html = `
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=${data.encoding}">
</head>
<body>
<pre style="font-family: '${data.font}' !important; font-size: 12pt; white-space: pre-wrap;">
${data.data}
</pre>
</body>
</html>
        `;

        const tmp = new TmpFile( { "extname": ".html" } );

        fs.writeFileSync( tmp.path, html );

        childProcess.exec( `start "" "${url.pathToFileURL( tmp.path )}"` );

        return result( 200 );
    }

    async API_lint ( data ) {
        if ( data.path == null || data.path === "" ) data.path = "temp";

        const file = new File( {
            "path": data.path,
            "type": data.type,
            "content": data.content,
        } );

        return await new LintFile( file, { "processUnsupported": true } ).run( data.action );
    }
}
