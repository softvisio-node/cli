import childProcess from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import url from "node:url";
import File from "#core/file";
import Server from "#core/http/server";
import msgpack from "#core/msgpack";
import openUrl from "#core/open-url";
import stream from "#core/stream";
import * as msgPackStream from "#core/stream/msgpack";
import { TmpFile } from "#core/tmp";
import { lintFile } from "#lib/lint";
import Api from "#lib/rpc/api";
import * as constants from "#lib/rpc/constants";

export default class RpcServer {

    // public
    async start ( { daemon } = {} ) {
        var res;

        const api = new Api();

        // exit current server
        await api.call( "exit" );

        // start daemon
        if ( daemon ) {
            const proc = childProcess.spawn( process.argv[ 0 ], [ process.argv[ 1 ], "lsp", "start", "--no-daemon" ], {
                "detached": true,
                "stdio": "ignore",
            } );

            proc.unref();

            return result( 200 );
        }

        // start server
        else {
            res = await this.#startNvimServer();
            if ( !res.ok ) return res;

            res = await this.#startLspServer();
            if ( !res.ok ) return res;

            res = await this.#startApiServer();
            if ( !res.ok ) return res;

            return new Promise( resolve => {} );
        }
    }

    // private
    async #startNvimServer () {
        const server = net.createServer( socket => {
            const decoder = new msgPackStream.Decode();

            decoder.on( "data", async msg => {
                try {
                    const res = await this.#runCommand( msg[ 2 ], msg[ 3 ] );

                    socket.write( msgpack.encode( [ 1, msg[ 1 ], null, res ] ) );
                }
                catch ( e ) {
                    console.log( e );

                    socket.write( msgpack.encode( [ 1, msg[ 1 ], "error", null ] ) );
                }
            } );

            stream.pipeline( socket, decoder, () => {} );
        } );

        server.on( "error", e => {
            console.log( e );

            process.exit( 1 );
        } );

        server.listen( constants.vimPort, constants.host );

        return result( 200 );
    }

    // XXX
    async #startLspServer () {
        const server = net.createServer( async socket => {
            while ( true ) {
                const headers = await socket.readHttpHeaders();

                const length = headers?.match( /content-length: *(\d+)/im )?.[ 1 ];

                if ( !length ) break;

                const data = await socket.readChunk( Number( length ) );

                if ( !data ) break;

                const msg = JSON.parse( data );

                // shutdown
                if ( msg.method === "shutdown" ) {
                    break;
                }

                // initialize
                else if ( msg.method === "initialize" ) {
                    this.#sendLspResponse(
                        socket,
                        msg.id,

                        // https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#initializeresult
                        {
                            "serverInfo": {
                                "name": "softvisio",
                            },

                            // https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#serverCapabilities
                            "capabilities": {
                                "positionEncoding": "utf8",

                                // "textDocumentSync": {},
                                // "documentFormattingProvider": true,
                                // "documentRangeFormattingProvider": false,
                            },
                        }
                    );
                }

                // custom method
                else if ( msg.method.startsWith( "softvisio/" ) ) {
                    const method = msg.method.replace( "softvisio/", "" );

                    var res;

                    if ( method === "lint-file" ) {
                        res = await this.#API_lintFile( msg.params );
                    }
                    else if ( method === "browser-print" ) {
                        res = await this.#API_browserPrint( msg.params );
                    }

                    // unknown method
                    else {
                        res = result( [ 404, "API method not found" ] );
                    }

                    this.#sendLspResponse( socket, msg.id, res );
                }

                // unknown method
                else {
                    const res = result( [ 404, "API method not found" ] );

                    this.#sendLspResponse( socket, msg.id, res );
                }
            }
        } );

        server.listen( constants.lspPort, constants.host );

        return result( 200 );
    }

    async #startApiServer () {
        const server = new Server().ws( "/*", {
            "maxPayloadLength": constants.maxPayloadSize,

            "onConnect": connection => {
                connection.on( "message", async ( connection, data, isBinary ) => {
                    try {
                        const msg = JSON.parse( Buffer.from( data ) );

                        if ( !msg.id ) return;

                        if ( !msg.method ) return;

                        const method = msg.method.replace( /^\/v\d+\//, "" );

                        const res = await this.#runCommand( method, msg.params );

                        connection.send( JSON.stringify( res.toJsonRpc( msg.id ) ), false );
                    }
                    catch {}
                } );
            },
        } );

        return server.start( {
            "address": constants.host,
            "port": constants.apiPort,
        } );
    }

    #sendLspResponse ( socket, id, result ) {
        if ( !id ) return;

        const res = JSON.stringify( {
            "jsonrpc": "2.0",
            id,
            result,
        } );

        socket.write( `Content-Length: ${ res.length }\r\n\r\n${ res }` );
    }

    async #runCommand ( method, args ) {
        if ( method === "test" ) {
            return this.#API_test();
        }
        else if ( method === "exit" ) {
            return this.#API_exit();
        }
        else if ( method === "lint-file" ) {
            return this.#API_lintFile( ...args );
        }
        else if ( method === "browser-print" ) {
            return this.#API_browserPrint( ...args );
        }
        else {
            return result( 404 );
        }
    }

    async #API_test () {
        return result( 200 );
    }

    async #API_exit () {
        process.exit();
    }

    async #API_lintFile ( data ) {
        if ( data.path == null || data.path === "" ) data.path = "temp";

        const file = new File( {
            "path": path.isAbsolute( data.path )
                ? data.path
                : path.join( data.cwd, data.path ),
            "buffer": data.buffer,
        } );

        return lintFile( file, {
            "action": data.action,
            "type": data.type,
            "processUnsupportedTypes": true,
        } );
    }

    async #API_browserPrint ( data ) {
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

        openUrl( url.pathToFileURL( tmp.path ) );

        return result( 200 );
    }
}
