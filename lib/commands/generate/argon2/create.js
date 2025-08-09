import Argon2 from "#core/argon2";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        const argon2 = new Argon2();

        return {
            "options": {
                "id": {
                    "short": "i",
                    "description": "Argon2 algorithm id.",
                    "default": argon2.id,
                    "schema": { "enum": [ "argon2d", "argon2i", "argon2id" ] },
                },
                "argon2-version": {
                    "short": "v",
                    "description": "Argon2 algorithm version.",
                    "default": argon2.version,
                    "schema": { "enum": [ 16, 19 ] },
                },
                "memory-cost": {
                    "short": "m",
                    "description": "Argon2 memory cost parameter.",
                    "default": argon2.memoryCost,
                    "schema": { "type": "integer", "minimum": 1, "maximum": 2 ** 32 - 1 },
                },
                "time-cost": {
                    "short": "t",
                    "description": "Argon2 time cost parameter.",
                    "default": argon2.timeCost,
                    "schema": { "type": "integer", "minimum": 1, "maximum": 2 ** 32 - 1 },
                },
                "parallelism": {
                    "short": "p",
                    "description": "Argon2 parallelism parameter.",
                    "default": argon2.parallelism,
                    "schema": { "type": "integer", "minimum": 1, "maximum": 255 },
                },
                "salt-length": {
                    "short": "s",
                    "description": "Argon2 salt length.",
                    "default": argon2.saltLength,
                    "schema": { "type": "integer", "minimum": 8, "maximum": 48 },
                },
                "hash-length": {
                    "short": "h",
                    "description": "Argon2 hash length.",
                    "default": argon2.hashLength,
                    "schema": { "type": "integer", "minimum": 12, "maximum": 64 },
                },
            },
            "arguments": {
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
            hash = await argon2.createHash( process.cli.arguments.password );

        console.log( hash );
    }
}
