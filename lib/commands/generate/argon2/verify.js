import Argon2 from "#core/argon2";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "id": {
                    "short": "i",
                    "description": "Argon2 algorithm to use.",
                    "default": "argon2id",
                    "schema": { "enum": [ "argon2d", "argon2i", "argon2id" ] },
                },
                "argon2-version": {
                    "short": "v",
                    "description": "Argon2 algorithm version.",
                    "default": 19,
                    "schema": { "enum": [ 16, 19 ] },
                },
                "memory-cost": {
                    "short": "m",
                    "description": "Argon2 memory cost parameter.",
                    "default": 65_536,
                    "schema": { "type": "integer", "minimum": 1, "maximum": 2 ** 32 - 1 },
                },
                "time-cost": {
                    "short": "t",
                    "description": "Argon2 time cost parameter.",
                    "default": 3,
                    "schema": { "type": "integer", "minimum": 1, "maximum": 2 ** 32 - 1 },
                },
                "parallelism": {
                    "short": "p",
                    "description": "Argon2 parallelism parameter.",
                    "default": 4,
                    "schema": { "type": "integer", "minimum": 1, "maximum": 255 },
                },
                "salt-length": {
                    "short": "s",
                    "description": "Argon2 salt length parameter.",
                    "default": 16,
                    "schema": { "type": "integer", "minimum": 8, "maximum": 48 },
                },
                "hash-length": {
                    "short": "h",
                    "description": "Argon2 hash length parameter.",
                    "default": 32,
                    "schema": { "type": "integer", "minimum": 12, "maximum": 64 },
                },
            },
            "arguments": {
                "digest": {
                    "description": "Argon2 digest in PHC format.",
                    "required": true,
                    "schema": { "type": "string" },
                },
                "password": {
                    "description": "Password to hash.",
                    "required": true,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        const argon2 = new Argon2( {
                "id": process.cli.options.id,
                "version": process.cli.options[ "argon2-version" ],
                "memoryCost": process.cli.options[ "memory-cost" ],
                "timeCost": process.cli.options[ "time-cost" ],
                "parallelism": process.cli.options[ "parallelism" ],
                "saltLength": process.cli.options[ "salt-length" ],
                "hashLength": process.cli.options[ "hash-length" ],
            } ),
            valid = await argon2.verifyHash( process.cli.arguments.digest, process.cli.arguments.password );

        console.log( "Hash is valid:", valid );

        return valid
            ? result( 200 )
            : result( 400 );
    }
}
