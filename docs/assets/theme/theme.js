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
        document.addEventListener( "click", this.#onClick.bind( this ) );

        this.#setTheme( theme );
    }

    // private
    #setTheme ( theme ) {
        this.#currentTheme = theme;

        this.#link.setAttribute( "href", THEMES[theme].href );

        localStorage.setItem( STORAGE_KEY, theme );
    }

    #toggleTheme () {
        this.#setTheme( this.#currentTheme === "light" ? "dark" : "light" );
    }

    #onClick ( e ) {
        if ( !e.target.hasAttribute( "data-link-theme" ) ) return;

        this.#toggleTheme();
    }
}

new Theme();
