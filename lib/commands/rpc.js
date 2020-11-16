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
        const net = require( "net" ),
            readline = require( "readline" );

        var server = net.createServer( socket => {
            socket.on( "error", e => {
                socket.destroy();
            } );

            var rl = readline.createInterface( socket, socket );

            rl.on( "line", async data => {
                try {
                    data = JSON.parse( data );
                }
                catch ( e ) {
                    socket.write( "\n" );

                    return;
                }

                const res = await this["CMD_" + data[1].cmd]( data[1] );

                if ( res != null ) socket.write( JSON.stringify( [data[0], res] ) + "\n" );
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
    }

    async CMD_src ( data ) {
        const File = require( "../src/file" ),
            path = require( "path" );

        if ( data.path == null || data.path === "" ) data.path = "temp";

        if ( data.ft ) {
            if ( data.ft === "javascript" ) data.ft = "js";

            const extname = "." + data.ft.toLowerCase();

            if ( path.extname( data.path ).toLowerCase() !== extname ) data.path += extname;
        }

        return await new File( data.path, { "data": data.data, "processUnsupported": true } ).run( data.action );
    }
};
