import Command from "#lib/command";
import fs from "node:fs";

export default class extends Command {
    static cli () {
        return {
            "options": {
                "all": {
                    "short": "a",
                    "description": "test all sub-packages",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "benchmarks": {
                    "short": "b",
                    "description": "run benchmarks",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "verbose": {
                    "short": "v",
                    "description": "show individual tests results",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "show-skipped": {
                    "short": "s",
                    "description": "show skipped tests",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "show-passed": {
                    "short": "p",
                    "description": "show passed tests",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "show-stack-trace": {
                    "short": "t",
                    "description": "enables stack trace in test results output",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "show-console-log": {
                    "short": "c",
                    "description": "show messages, printed to the console",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "module-pattern": {
                    "description": "a regexp pattern string that is matched against all modules paths before executing the test",
                    "schema": { "type": "string" },
                },
                "first-level-pattern": {
                    "description": "a regexp pattern string that is matched against all first level tests names before executing the test",
                    "schema": { "type": "string" },
                },
                "second-level-pattern": {
                    "description": "a regexp pattern string that is matched against all second level tests names before executing the test",
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {

        // test single module
        if ( process.cli.arguments[ "module-pattern" ] && fs.existsSync( process.cli.arguments[ "module-pattern" ] ) && fs.statSync( process.cli.arguments[ "module-pattern" ] ).isFile() ) {
            return await this.#testSingleModule( process.cli.arguments[ "module-pattern" ] );
        }

        const packages = [];

        if ( process.cli.options.all ) {
            const pkg = this._findGitPackage();

            if ( !pkg ) this._throwError( `Unable to find root package` );

            packages.push( pkg, ...pkg.subPackages );
        }
        else {
            const pkg = this._findPackage();

            if ( !pkg ) this._throwError( `Unable to find package` );

            packages.push( pkg );
        }

        const options = this.#composeOptions();

        var error;

        for ( const pkg of packages ) {
            const res = await pkg.test( options );

            if ( !res.ok ) error = true;
        }

        if ( error ) return result( [ 500, `Tests failed` ] );
    }

    // private
    async #testSingleModule ( _path ) {
        const { runner } = await import( "#core/tests" ),
            { "default": path } = await import( "path" ),
            { "default": url } = await import( "url" );

        await runner.loadModule( url.pathToFileURL( path.resolve( _path ) ), path.basename( _path ) );

        const options = this.#composeOptions();

        delete options.modulePattern;

        return runner.run( options );
    }

    #composeOptions () {
        return {
            "benchmarks": process.cli.options.benchmarks,
            "verbose": process.cli.options.verbose,
            "showSkipped": process.cli.options[ "show-skipped" ],
            "showPassed": process.cli.options[ "show-passed" ],
            "showStackTrace": process.cli.options[ "show-stack-trace" ],
            "showConsoleLog": process.cli.options[ "show-console-log" ],

            "modulePattern": process.cli.arguments[ "module-pattern" ],
            "firstLevelPattern": process.cli.arguments[ "first-level-pattern" ],
            "secondLevelPattern": process.cli.arguments[ "second-level-pattern" ],
        };
    }
}
