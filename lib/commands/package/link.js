import Command from "#lib/command";
import glob from "#core/glob";
import { readConfig } from "#core/config";

export default class extends Command {
    static cli () {
        return {};
    }

    // public
    async run () {
        const workspace = process.env[ "SOFTVISIO_CLI_WORKSPACE_" + process.platform ];

        if ( !workspace ) return result( [ 500, `No workspace configured` ] );

        const pkg = this._findPackage();

        if ( !pkg ) return result( [ 500, "Package not found" ] );

        const dependencies = this.#getDependencies( pkg.config );

        if ( !dependencies.size ) return result( 200 );

        const files = glob( "*/*/package.json", {
            "cwd": workspace,
        } );

        const packages = {};

        for ( const file of files ) {
            const config = readConfig( workspace + "/" + file );

            if ( !config.name || config.private ) continue;

            packages[ config.name ] = {
                "name": config.name,
                "path": workspace + "/" + file,
                "dependencies": this.#getDependencies( config ),
            };
        }
    }

    // private
    #getDependencies ( config ) {
        return new Set( [

            //
            ...Object.keys( config.dependencies || {} ),
            ...Object.keys( config.devDependencies || {} ),
            ...Object.keys( config.peerDependencies || {} ),
        ] );
    }
}
