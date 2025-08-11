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
                "id": {
                    "short": "i",
                    "description": "Argon2 algorithm id.",
                    "schema": { "enum": [ "argon2d", "argon2i", "argon2id" ] },
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
                "salt-length": {
                    "short": "s",
                    "description": "Argon2 salt length.",
                    "schema": { "type": "integer", "minimum": 8, "maximum": 48 },
                },
                "hash-length": {
                    "short": "h",
                    "description": "Argon2 hash length.",
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
                "preset": process.cli.options.preset,
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
