const STORAGE_KEY = "theme";
const THEMES = new Set( ["light", "dark"] );
const DEFAULT_THEME = "light";
const TOC_SELECTOR = ".markdown-section h1, h2, h3";

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

        window.$docsify.plugins ||= [];
        window.$docsify.plugins.push( this.#docsifyHook.bind( this ) );
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
            document.querySelector( `#darkTheme` ).removeAttribute( "disabled" );
            document.querySelector( `#lightTheme` ).setAttribute( "disabled", "true" );
        }

        localStorage.setItem( STORAGE_KEY, theme );
    }

    #toggleTheme ( e ) {
        this.#setTheme( this.#currentTheme === "light" ? "dark" : "light" );

        return false;
    }

    #docsifyHook ( hook, vm ) {
        hook.doneEach( () => {
            const tocEl = document.querySelector( "toc" );

            // no toc div found
            if ( !tocEl ) return;

            const header = document.createElement( "div" );
            header.classList.add( "header" );
            header.textContent = "Table of Contents";
            tocEl.appendChild( header );

            const headings = document.querySelectorAll( TOC_SELECTOR );

            // no headings found
            if ( !headings.length ) return;

            const lists = [tocEl];
            let minLevel = 0,
                currentLevel = 0;

            // find minimal heading level
            for ( const heading of headings ) {
                const tag = heading.tagName,
                    level = +tag.substr( 1 );

                if ( !minLevel ) minLevel = level;
                else if ( level < minLevel ) minLevel = level;
            }

            // create toc
            for ( const heading of headings ) {
                const tag = heading.tagName,
                    level = +tag.substr( 1 ) + 1 - minLevel;

                let list;

                if ( level !== currentLevel ) {
                    if ( level > currentLevel ) {
                        for ( let n = 0; n < level - currentLevel; n++ ) {
                            list = document.createElement( "ul" );

                            lists[lists.length - 1].appendChild( list );

                            lists.push( list );
                        }
                    }
                    else {
                        for ( let n = 0; n < currentLevel - level; n++ ) {
                            lists.pop();
                        }
                    }

                    currentLevel = level;
                }

                list = lists[lists.length - 1];

                const link = heading.querySelector( "a" ),
                    li = document.createElement( "li" ),
                    a = document.createElement( "a" );

                a.setAttribute( "href", link.getAttribute( "href" ) );
                a.textContent = link.textContent;
                a.classList.add( "link" );

                li.appendChild( a );
                list.appendChild( li );
            }
        } );
    }
}

new Theme();
