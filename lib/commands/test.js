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
                "testNamePattern": {
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
                "testNamePattern": process.cli.options.testNamePattern,
                "testPathPattern": process.cli.arguments.testPathPattern,
            } );

            if ( !res.ok ) error = true;
        }

        if ( error ) this._exitOnError();
    }
}
