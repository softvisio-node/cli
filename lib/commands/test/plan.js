import Command from "#lib/command";

export default class extends Command {
    static cli () {
        return {
            "title": "Get test plan",
            "options": {
                "all": {
                    "short": "a",
                    "description": "Test all linked packages.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "benchmarks": {
                    "short": "b",
                    "description": "Work with the benchmarks.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "level": {
                    "short": "l",
                    "description": "Maximum tests level to show. 1 - modules, 2 - second level (groups or top-level tests), 3 - show all tests.",
                    "default": 2,
                    "schema": { "type": "number", "minimum": 1, "maximum": 3 },
                },
                "json": {
                    "short": "j",
                    "description": "JSON output.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "modulePattern": {
                    "description": "A regexp pattern string that is matched against all modules paths before executing the test.",
                    "schema": { "type": "string" },
                },
                "firstLevelPattern": {
                    "description": "A regexp pattern string that is matched against all first level tests names before executing the test.",
                    "schema": { "type": "string" },
                },
                "secondLevelPattern": {
                    "description": "A regexp pattern string that is matched against all second level tests names before executing the test.",
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

        for ( const pkg of packages ) {
            const plan = await pkg.testPlan( options );

            if ( process.cli.options.json ) console.log( JSON.stringify( plan ) );
        }
    }

    // private
    async #testSingleModule ( _path ) {
        const { runner } = await import( "#core/tests" ),
            { "default": path } = await import( "path" ),
            { "default": url } = await import( "url" );

        await runner.loadModule( url.pathToFileURL( path.resolve( _path ) ), path.basename( _path ) );

        const options = this.#composeOptions();

        delete options.modulePathPattern;

        const plan = runner.plan( options );

        if ( process.cli.options.json ) console.log( JSON.stringify( plan ) );
    }

    #composeOptions () {
        return {
            "benchmarks": process.cli.options.benchmarks,
            "level": process.cli.options.level,
            "json": process.cli.options.json,

            "modulePattern": process.cli.arguments.modulePattern,
            "firstLevelPattern": process.cli.arguments.firstLevelPattern,
            "secondLevelPattern": process.cli.arguments.secondLevelPattern,
        };
    }
}
