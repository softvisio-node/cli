const STORAGE_KEY = "theme";

const THEMES = {
    "light": { "splash": "#ffffff", "href": "https://cdn.jsdelivr.net/npm/docsify-themeable/dist/css/theme-simple.css" },
    "dark": { "splash": "#242e33", "href": "https://cdn.jsdelivr.net/npm/docsify-themeable/dist/css/theme-simple-dark.css" },
};

const DEFAULT_THEME = "light";

class Theme {
    #link;
    #currentTheme;

    constructor () {
        var theme = localStorage.getItem( STORAGE_KEY ) || DEFAULT_THEME;

        if ( !THEMES[theme] ) theme = DEFAULT_THEME;

        // create splash screen
        const splash = document.createElement( "div" );
        splash.style = "position:absolute;top:0;left:0;height:100%;width:100%";
        splash.style.background = THEMES[theme].splash;
        document.body.appendChild( splash );

        this.#link = document.createElement( "link" );
        this.#link.setAttribute( "rel", "stylesheet" );
        this.#link.addEventListener( "load", () => splash.parentNode.removeChild( splash ) );
        document.head.appendChild( this.#link );

        // add click listener
        document.querySelectorAll( `a[href="#toggleTheme"]` ).forEach( el => ( el.onclick = this.#toggleTheme.bind( this ) ) );

        this.#setTheme( theme );

        // set goToTop click handler
        document.querySelectorAll( `a[href="#goToTop"]` ).forEach( el => ( el.onclick = this.#goToTop.bind( this ) ) );
    }

    // private
    #goToTop ( e ) {
        window.scroll( {
            "top": 0,
            "left": 0,
            "behavior": "smooth",
        } );

        return false;
    }

    #setTheme ( theme ) {
        this.#currentTheme = theme;

        this.#link.setAttribute( "href", THEMES[theme].href );

        localStorage.setItem( STORAGE_KEY, theme );
    }

    #toggleTheme ( e ) {
        this.#setTheme( this.#currentTheme === "light" ? "dark" : "light" );

        return false;
    }
}

new Theme();
