import Command from "#lib/command";

export default class extends Command {
    static cli () {
        return {
            "options": {
                "global": {
                    "description": "install git hooks globally",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "local": {
                    "description": "install git hook locally to the current project only",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    // public
    async run () {
        if ( process.cli.options.global ) await this.#installGlobal();

        if ( process.cli.options.local ) await this.#installLocal();
    }

    // private
    async #installGlobal () {
        const { "default": fs } = await import( "#core/fs" ),
            { confirm } = await import( "#core/utils" ),
            os = await import( "os" ),
            git = this._getGit();

        const hooksPath = await git.run( "config", "--global", "--get", "core.hookspath" );

        if ( !hooksPath.ok ) this._throwError( `Git run error.` );

        if ( !hooksPath.data ) this._throwError( `Unable to find global git hooks path. Check, that your global git config file contains "core.hookspath" variable defined.` );

        hooksPath.data = hooksPath.data.trim();

        if ( hooksPath.data.charAt( 0 ) === "~" ) hooksPath.data = os.homedir() + "/" + hooksPath.data.substr( 1 );

        if ( !fs.existsSync( hooksPath.data ) ) fs.mkdirSync( hooksPath.data, { "recursive": true } );

        if ( fs.existsSync( hooksPath.data + "/pre-commit" ) && ( await confirm( "Global pre-commit hook is already exists. Overwrite?", ["n", "y"] ) ) !== "y" ) return;

        fs.copyFileSync( fs.resolve( "#resources/pre-commit", import.meta.url ), hooksPath.data + "/pre-commit" );

        console.log( "Global git pre-commit hook installed." );
    }

    async #installLocal () {
        const { "default": fs } = await import( "#core/fs" ),
            { confirm } = await import( "#core/utils" );

        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find project root.` );

        const hooksPath = rootPackage.root + "/.git/hooks";

        if ( !fs.existsSync( hooksPath ) ) fs.mkdirSync( hooksPath, { "recursive": true } );

        if ( fs.existsSync( hooksPath + "/pre-commit" ) && ( await confirm( "Local pre-commit hook is already exists. Overwrite?", ["n", "y"] ) ) !== "y" ) return;

        fs.copyFileSync( fs.resolve( "#resources/pre-commit", import.meta.url ), hooksPath + "/pre-commit" );

        const res = await rootPackage.git.run( "config", "--local", "--replace-all", "core.hooksPath", ".git/hooks" );

        if ( !res.ok ) this._throwError( `Unable to update local git config.` );

        console.log( "Local git pre-commit hook installed." );
    }
}
