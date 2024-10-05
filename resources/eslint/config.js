import mixins from "#core/mixins";
import Comments from "./comments.js";
import Eslint from "./eslint.js";
import Globals from "./globals.js";
import Import from "./import.js";
import LanguageOptions from "./language-options.js";
import Softvisio from "./softvisio.js";
import Stylistic from "./stylistic.js";
import Unicorn from "./unicorn.js";

class BaseConfig {

    // public
    create ( editorConfig ) {
        return [

            //
            ...this.createConfig(),
            ...this.createEditorConfig( editorConfig ),
            ...this.createOverrides(),
        ];
    }

    createConfig () {
        return this._createConfig();
    }

    createEditorConfig ( editorConfig ) {
        if ( editorConfig ) {
            return this._createEditorConfig( editorConfig );
        }
        else {
            return [];
        }
    }

    createOverrides () {
        return this._createOverrides();
    }

    // protected
    _createConfig () {
        return [];
    }

    _createEditorConfig ( editorConfig ) {
        return [];
    }

    _createOverrides () {
        return [];
    }
}

export default class Config extends mixins(

    //
    LanguageOptions,
    Globals,
    Stylistic,
    Import,
    Unicorn,
    Softvisio,
    Comments,
    Eslint,
    BaseConfig
) {}
