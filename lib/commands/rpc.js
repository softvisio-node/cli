import Command from "../command.js";
import msgpack from "#core/msgpack";
import net from "net";
import url from "url";
import LintFile from "#lib/lint/file";
import File from "#core/file";

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
            const decoder = new msgpack.decode.Stream();

            socket.on( "error", e => decoder.destroy() );

            decoder.on( "data", async msg => {
                try {
                    const res = await this["API_" + msg[2]]( ...msg[3] );

                    socket.write( msgpack.encode( [1, msg[1], null, res] ) );
                }
                catch ( e ) {
                    socket.write( msgpack.encode( [1, msg[1], "error", null] ) );
                }
            } );

            socket.pipe( decoder );
        } );

        server.on( "error", e => {
            console.log( e + "" );

            process.exit( EXIT_CODE_ON_ERROR );
        } );

        await server.listen( PORT, "127.0.0.1" );
    }

    async API_browser_print ( data ) {
        const fs = await import( "fs" ),
            os = await import( "os" ),
            child_process = await import( "child_process" );

        if ( process.platform !== "win32" ) return;

        data.data.replace( /\t/g, "    " );
        data.data.replace( /&/g, "&amp;" );
        data.data.replace( /</g, "&lt;" );
        data.data.replace( />/g, "&gt;" );
        data.data.replace( /"/g, "&quot;" );
        data.data.replace( /'/g, "&#39;" );

        if ( data.font ) data.font = data.font.split( /:/ )[0].replace( /_/g, " " );

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

        const path = os.tmpdir() + "/vim-browserprint.html";

        fs.writeFileSync( path, html );

        child_process.exec( "start " + url.pathToFileURL() );

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
