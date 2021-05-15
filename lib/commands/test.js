import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "summary": "Run tests.",
            "options": {
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
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Project root wasn't found.` );

        const res = await rootPackage.test( {
            "testNamePattern": process.cli.options.testNamePattern,
            "testPathPattern": process.cli.arguments.testPathPattern,
        } );

        if ( !res.ok ) process.exit( 1 );
        else process.exit();
    }
}
