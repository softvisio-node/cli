import fs from "node:fs";
import Git from "../git.js";

export default class Wiki {
    #rootPackage;
    #git;

    constructor ( rootPackage ) {
        this.#rootPackage = rootPackage;
    }

    get rootPackage () {
        return this.#rootPackage;
    }

    get root () {
        return this.rootPackage.root + "/wiki";
    }

    get isExists () {
        return fs.existsSync( this.root );
    }

    get git () {
        if ( !this.#git ) {
            this.#git = new Git( this.root );
        }

        return this.#git;
    }
}
