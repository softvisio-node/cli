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
            const proc = childProcess.spawn( process.argv[ 0 ], [ process.argv[ 1 ], "rpc", "start", "--no-daemon" ], {
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
            "type": data.type,
            "buffer": data.buffer,
        } );

        return lintFile( file, {
            "action": data.action,
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
