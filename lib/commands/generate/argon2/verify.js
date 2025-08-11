import Argon2 from "#core/argon2";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "preset": {
                    "short": "P",
                    "description": "Argon2 preset.",
                    "default": Argon2.defaultPreset,
                    "schema": { "enum": Object.keys( Argon2.presets ) },
                },
                "argon2-version": {
                    "short": "v",
                    "description": "Argon2 algorithm version.",
                    "schema": { "enum": [ 16, 19 ] },
                },
                "memory-cost": {
                    "short": "m",
                    "description": "Argon2 memory cost parameter in KiB.",
                    "schema": { "type": "integer", "minimum": 1, "maximum": 2 ** 32 - 1 },
                },
                "time-cost": {
                    "short": "t",
                    "description": "Argon2 time cost parameter.",
                    "schema": { "type": "integer", "minimum": 1, "maximum": 2 ** 32 - 1 },
                },
                "parallelism": {
                    "short": "p",
                    "description": "Argon2 parallelism parameter.",
                    "schema": { "type": "integer", "minimum": 1, "maximum": 255 },
                },
            },
            "arguments": {
                "password": {
                    "description": "Password to hash.",
                    "required": true,
                    "schema": { "type": "string" },
                },
                "digest": {
                    "description": "Argon2 digest in PHC format.",
                    "required": true,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        const argon2 = new Argon2( {
                "preset": process.cli.options.preset,
                "version": process.cli.options[ "argon2-version" ],
                "memoryCost": process.cli.options[ "memory-cost" ],
                "timeCost": process.cli.options[ "time-cost" ],
                "parallelism": process.cli.options[ "parallelism" ],
            } ),
            valid = await argon2.verifyHash( process.cli.arguments.digest, process.cli.arguments.password );

        console.log( "Hash is valid:", valid );

        return valid
            ? result( 200 )
            : result( 400 );
    }
}
