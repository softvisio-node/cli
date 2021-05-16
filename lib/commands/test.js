import Command from "../command.js";

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
                "log": {
                    "summary": "Prints only tests final status.",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
                "bail": {
                    "summary": "Exit the test suite immediately after `n` number of failing tests.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "stack-trace": {
                    "summary": "Enables stack trace in test results output.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "silent": {
                    "short": "S",
                    "summary": "Prevent tests from printing messages through the console.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "test-name-pattern": {
                    "short": "t",
                    "summary": "Run only tests with a name that matches the regex pattern.",
                    "schema": { "type": "string" },
                },
            },
            "arguments": {
                "testPathPattern": {
                    "summary": "A regexp pattern string that is matched against all tests paths before executing the test.",
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {
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

        var error;

        for ( const pkg of packages ) {
            const res = await pkg.test( {
                "log": process.cli.options.log,
                "bail": process.cli.options.bail,
                "silent": process.cli.options.silent,
                "stackTrace": process.cli.options["stack-trace"],
                "testNamePattern": process.cli.options["test-name-pattern"],
                "testPathPattern": process.cli.arguments.testPathPattern,
                "jestArgv": process.cli.argv,
            } );

            if ( !res.ok ) error = true;
        }

        if ( error ) this._exitOnError();
    }
}
