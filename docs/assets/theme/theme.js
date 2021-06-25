const STORAGE_KEY = "theme";
const THEMES = new Set( ["light", "dark"] );
const TOC_SELECTOR = ".markdown-section h1, h2, h3, h4";

class Theme {
    #currentTheme;

    constructor () {
        var theme = localStorage.getItem( STORAGE_KEY );

        if ( !theme || !THEMES.has( theme ) ) theme = window.matchMedia && window.matchMedia( "(prefers-color-scheme: dark)" ).matches ? "dark" : "light";

        // set toggleTheme click handler
        document.querySelectorAll( `a[href="#toggleTheme"]` ).forEach( el => ( el.onclick = this.#toggleTheme.bind( this ) ) );

        this.#setTheme( theme );

        // set gotoTop click handler
        document.querySelectorAll( `a[href="#gotoTop"]` ).forEach( el => ( el.onclick = this.#gotoTop.bind( this ) ) );

        window.$docsify.plugins ||= [];
        window.$docsify.plugins.push( this.#docsifyHook.bind( this ) );

        // listen for system dark mode change
        window.matchMedia( "(prefers-color-scheme: dark)" ).addEventListener( "change", e => {
            this.#setTheme( e.matches ? "dark" : "light" );
        } );
    }

    // private
    #gotoTop ( e ) {
        const oldURL = window.location.href,
            newURL = oldURL.replace( /\?.*/, "" );

        if ( oldURL !== newURL ) history.pushState( {}, null, newURL );

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
        hook.beforeEach( this.#linkifyTypes.bind( this ) );

        hook.doneEach( this.#generateTOC.bind( this ) );
    }

    #generateTOC () {
        const headings = document.querySelectorAll( TOC_SELECTOR );

        // no headings found
        if ( !headings.length ) return;

        const tocEl = document.createElement( "toc" );

        const header = document.createElement( "div" );
        header.classList.add( "header" );
        header.textContent = "Table of Contents";
        tocEl.appendChild( header );

        const levels = {},
            lists = [tocEl];

        let currentLevel = 0;

        // find minimal heading level
        for ( const heading of headings ) {
            const tag = heading.tagName,
                level = +tag.substr( 1 );

            levels[level] = level;
        }

        const sortedLevels = Object.keys( levels ).sort();

        for ( let n = 0; n < sortedLevels.length; n++ ) {
            levels[sortedLevels[n]] = n + 1;
        }

        // create toc
        for ( const heading of headings ) {
            const tag = heading.tagName,
                level = levels[tag.substr( 1 )];

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

        const article = document.querySelector( "article.markdown-section" );
        article.insertBefore( tocEl, article.firstChild );
    }

    #linkifyTypes ( content ) {
        const types = window.$docsify.types;

        if ( !types ) return content;

        content = content.replaceAll( /\\?<(\w+)(\[\])?\\?>/g, ( match, type, array ) => {
            if ( types[type] ) {
                return `[<${type}${array ?? ""}\\>](${types[type]})`;
            }
            else {
                return match;
            }
        } );

        return content;
    }
}

new Theme();
