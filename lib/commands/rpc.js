const { toMsgPack, fromMsgPack } = require( "@softvisio/core/msgpack" );
const Command = require( "../command" );
const port = 55555;

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Run RPC service.",
            "description": "Start RPC server on address 127.0.0.1:55555.",
        };
    }

    async run () {
        const net = require( "net" );

        var server = net.createServer( socket => {
            let buf;

            socket.on( "error", e => {
                socket.destroy();
            } );

            socket.on( "data", async data => {
                if ( buf ) {
                    buf = Buffer.concat( [buf, data] );
                }
                else {
                    buf = data;
                }

                try {
                    const [msg, length] = fromMsgPack( buf, true );

                    buf = buf.slice( length );

                    const res = await this["CMD_" + msg[2]]( ...msg[3] );

                    socket.write( toMsgPack( [1, msg[1], null, res] ) );
                }
                catch ( e ) {}
            } );
        } );

        await server.listen( port, "127.0.0.1" );
    }

    async CMD_browser_print ( data ) {
        const fs = require( "fs" ),
            os = require( "os" ),
            child_process = require( "child_process" );

        if ( os.platform() !== "win32" ) return;

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

        fs.writeFileSync( os.tmpdir + "/vim-browserprint.html", html );

        child_process.exec( "start file://" + os.tmpdir + "/vim-browserprint.html" );

        return result( 200 );
    }

    async CMD_src ( data ) {
        const File = require( "../src/file" ),
            path = require( "path" );

        if ( data.path == null || data.path === "" ) data.path = "temp";

        if ( data.ft ) {
            if ( data.ft === "javascript" ) data.ft = "js";
            else if ( data.ft === "typescript" ) data.ft = "ts";
            else if ( data.ft === "make" ) data.ft = "";

            if ( data.ft ) {
                const extname = "." + data.ft.toLowerCase();

                if ( path.extname( data.path ).toLowerCase() !== extname ) data.path += extname;
            }
        }

        return await new File( data.path, { "data": data.data, "processUnsupported": true } ).run( data.action );
    }
};
