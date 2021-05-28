import Command from "#lib/command";

export default class extends Command {
    static cli () {
        return {
            "summary": "Run tests.",
            "options": {
                "all": {
                    "short": "a",
                    "summary": "Test all linked packages.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "benchmarks": {
                    "short": "b",
                    "summary": "Work with the benchmarks.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "verbose": {
                    "short": "v",
                    "summary": "Show individual tests results.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "show-skipped": {
                    "short": "s",
                    "summary": "Show skipped tests.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "show-passed": {
                    "short": "p",
                    "summary": "Show passed tests.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "show-stack-trace": {
                    "short": "t",
                    "summary": "Enables stack trace in test results output.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "show-console-log": {
                    "short": "c",
                    "summary": "Show messages, printed to the console.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "modulePattern": {
                    "summary": "A regexp pattern string that is matched against all modules paths before executing the test.",
                    "schema": { "type": "string" },
                },
                "firstLevelPattern": {
                    "summary": "A regexp pattern string that is matched against all first level tests names before executing the test.",
                    "schema": { "type": "string" },
                },
                "secondLevelPattern": {
                    "summary": "A regexp pattern string that is matched against all second level tests names before executing the test.",
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {
        const { "default": fs } = await import( "fs" );

        // test single module
        if ( process.cli.arguments.modulePathPattern && fs.existsSync( process.cli.arguments.modulePathPattern ) && fs.statSync( process.cli.arguments.modulePathPattern ).isFile() ) {
            return await this.#testSingleModule( process.cli.arguments.modulePathPattern );
        }

        const packages = [];

        if ( process.cli.options.all ) {
            const pkg = this._findRootPackage();

            if ( !pkg ) this._throwError( `Project root wasn't found.` );

            packages.push( pkg, ...pkg.packages );
        }
        else {
            const pkg = this._findNearestPackage();

            if ( !pkg ) this._throwError( `Project root wasn't found.` );

            packages.push( pkg );
        }

        const options = this.#composeOptions();

        var error;

        for ( const pkg of packages ) {
            const res = await pkg.test( options );

            if ( !res.ok ) error = true;
        }

        if ( error ) this._exitOnError();
    }

    // private
    async #testSingleModule ( _path ) {
        const { runner } = await import( "#core/tests" ),
            { "default": path } = await import( "path" ),
            { "default": url } = await import( "url" );

        await runner.loadModule( url.pathToFileURL( path.resolve( _path ) ), path.basename( _path ) );

        const options = this.#composeOptions();

        delete options.modulePathPattern;

        const res = await runner.run( options );

        if ( !res.ok ) this._exitOnError();
    }

    #composeOptions () {
        return {
            "benchmarks": process.cli.options.benchmarks,
            "verbose": process.cli.options.verbose,
            "showSkipped": process.cli.options["show-skipped"],
            "showPassed": process.cli.options["show-passed"],
            "showStackTrace": process.cli.options["show-stack-trace"],
            "showConsoleLog": process.cli.options["show-console-log"],

            "modulePattern": process.cli.arguments.modulePattern,
            "firstLevelPattern": process.cli.arguments.firstLevelPattern,
            "secondLevelPattern": process.cli.arguments.secondLevelPattern,
        };
    }
}
