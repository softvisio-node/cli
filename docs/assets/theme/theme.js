const STORAGE_KEY = "theme";
const THEMES = new Set( ["light", "dark"] );
const DEFAULT_THEME = "light";

class Theme {
    #currentTheme;

    constructor () {
        var theme = localStorage.getItem( STORAGE_KEY ) || DEFAULT_THEME;

        if ( !THEMES.has( theme ) ) theme = DEFAULT_THEME;

        // set toggleTheme click handler
        document.querySelectorAll( `a[href="#toggleTheme"]` ).forEach( el => ( el.onclick = this.#toggleTheme.bind( this ) ) );

        this.#setTheme( theme );

        // set gotoTop click handler
        document.querySelectorAll( `a[href="#gotoTop"]` ).forEach( el => ( el.onclick = this.#gotoTop.bind( this ) ) );
    }

    // private
    #gotoTop ( e ) {
        window.scroll( {
            "top": 0,
            "left": 0,
            "behavior": "smooth",
        } );

        return false;
    }

    #setTheme ( theme ) {
        this.#currentTheme = theme;

        if ( theme === "light" ) {
            document.querySelector( `#lightTheme` ).removeAttribute( "disabled" );
            document.querySelector( `#darkTheme` ).setAttribute( "disabled", "true" );
        }
        else {
            document.querySelector( `#lightTheme` ).setAttribute( "disabled", "true" );
            document.querySelector( `#darkTheme` ).removeAttribute( "disabled" );
        }

        localStorage.setItem( STORAGE_KEY, theme );
    }

    #toggleTheme ( e ) {
        this.#setTheme( this.#currentTheme === "light" ? "dark" : "light" );

        return false;
    }
}

new Theme();
