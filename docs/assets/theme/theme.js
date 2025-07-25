const STORAGE_KEY = "theme";
const THEMES = new Set( [ "light", "dark" ] );
const TOC_SELECTOR = "h1, h2, h3, h4";

class Theme {
    #currentTheme;

    constructor () {
        var theme = localStorage.getItem( STORAGE_KEY );

        if ( !theme || !THEMES.has( theme ) ) {
            theme = window.matchMedia && window.matchMedia( "(prefers-color-scheme: dark)" ).matches
                ? "dark"
                : "light";
        }

        // set toggleTheme click handler
        document.querySelectorAll( `a[href="#toggleTheme"]` ).forEach( el => ( el.onclick = this.#toggleTheme.bind( this ) ) );

        this.#setTheme( theme );

        // set gotoTop click handler
        document.querySelectorAll( `a[href="#gotoTop"]` ).forEach( el => ( el.onclick = this.#gotoTop.bind( this ) ) );

        window.$docsify.plugins ||= [];
        window.$docsify.plugins.push( this.#docsifyHook.bind( this ) );

        // listen for system dark mode change
        window.matchMedia( "(prefers-color-scheme: dark)" ).addEventListener( "change", e => {
            this.#setTheme( e.matches
                ? "dark"
                : "light" );
        } );
    }

    // private
    #gotoTop ( e ) {
        const oldUrl = window.location.href,
            newUrl = oldUrl.replace( /\?.*/, "" );

        if ( oldUrl !== newUrl ) history.pushState( {}, null, newUrl );

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
            document.querySelector( "#lightTheme" ).removeAttribute( "disabled" );
            document.querySelector( "#darkTheme" ).setAttribute( "disabled", "true" );
        }
        else {
            document.querySelector( "#darkTheme" ).removeAttribute( "disabled" );
            document.querySelector( "#lightTheme" ).setAttribute( "disabled", "true" );
        }

        localStorage.setItem( STORAGE_KEY, theme );
    }

    #toggleTheme ( e ) {
        this.#setTheme( this.#currentTheme === "light"
            ? "dark"
            : "light" );

        return false;
    }

    #docsifyHook ( hook, vm ) {
        hook.beforeEach( this.#beforeEach.bind( this ) );

        hook.doneEach( this.#generateToc.bind( this ) );
        hook.doneEach( this.#styleTypes.bind( this ) );
    }

    // XXX use mdast parser
    #beforeEach ( markdown ) {
        const blocks = markdown.split( /(```+)(.+?\1)/s );

        for ( let n = 0; n < blocks.length; n++ ) {

            // code block start
            if ( blocks[ n ].startsWith( "```" ) ) continue;

            // code block body
            if ( n && blocks[ n - 1 ].startsWith( "```" ) ) continue;

            blocks[ n ] = this.#linkifyTypes( blocks[ n ] );

            blocks[ n ] = this.#linkifyFootnotes( blocks[ n ] );
        }

        return blocks.join( "" );
    }

    #linkifyTypes ( markdown ) {
        const types = window.$docsify.types;

        if ( !types ) return markdown;

        markdown = markdown.replaceAll( /{([\w.[\\\]|]+)}/g, ( match, value ) => {
            const res = [];

            for ( const type of value.split( "|" ) ) {
                const url = types[ type.replace( /\\\[]$/, "" ) ];

                if ( !url ) return match;

                res.push( `\\<[${ type.replace( /\\\[]$/, "[]" ) }](${ url })>` );
            }

            return res.join( " | " );
        } );

        return markdown;
    }

    #linkifyFootnotes ( markdown ) {

        // [^1]:
        markdown = markdown.replaceAll(

            //
            /\[\^([\w-]+)]:/g,
            ( match, id ) => `<strong class="footnote-definition" id="footnote-${ id }">[[${ id }]](#footnote-${ id })</strong>:`
        );

        // [^1]
        markdown = markdown.replaceAll(

            //
            /\[\^([\w-]+)]/g,
            ( match, id ) => `<sup class="footnote-reference">[[${ id }]](#footnote-${ id })</sup>`
        );

        return markdown;
    }

    #styleTypes () {
        const types = window.$docsify.types;

        if ( !types ) return;

        const links = document.querySelectorAll( "article.markdown-section a" );

        for ( const link of links ) {
            const type = link.textContent.replace( "[]", "" );

            if ( !( type in types ) ) continue;

            link.classList.add( "data-type-tag" );
        }
    }

    #generateToc () {
        const article = document.querySelector( "article.markdown-section" ),
            headings = [ ...article.querySelectorAll( TOC_SELECTOR ) ],
            toc = this.#generateTocEl( headings );

        if ( !toc ) return;

        const header = document.createElement( "p" );
        header.classList.add( "header" );
        header.textContent = "Table of Contents";
        toc.insertBefore( header, toc.firstChild );

        article.insertBefore( toc, article.firstChild );

        // generate sub-toc
        while ( headings.length ) {
            const heading = headings.shift();

            this.#generateSubToc( heading, headings );
        }
    }

    #generateSubToc ( el, headings ) {
        const topLevel = +el.tagName.slice( 1 );

        if ( topLevel === 1 ) return;

        const subHeadings = [];

        for ( const heading of headings ) {
            const level = +heading.tagName.slice( 1 );

            if ( level <= topLevel ) break;

            subHeadings.push( heading );
        }

        if ( !subHeadings.length ) return;

        const toc = this.#generateTocEl( subHeadings );

        el.after( toc );
    }

    #generateTocEl ( headings ) {

        // no headings found
        if ( !headings.length ) return;

        const tocEl = document.createElement( "toc" );

        const levels = {},
            lists = [ tocEl ];

        let currentLevel = 0;

        // find minimal heading level
        for ( const heading of headings ) {
            const tag = heading.tagName,
                level = +tag.slice( 1 );

            levels[ level ] = level;
        }

        const sortedLevels = Object.keys( levels ).sort();

        for ( let n = 0; n < sortedLevels.length; n++ ) {
            levels[ sortedLevels[ n ] ] = n + 1;
        }

        // create toc
        for ( const heading of headings ) {
            const tag = heading.tagName,
                level = levels[ tag.slice( 1 ) ];

            let list;

            if ( level !== currentLevel ) {
                if ( level > currentLevel ) {
                    for ( let n = 0; n < level - currentLevel; n++ ) {
                        list = document.createElement( "ul" );

                        lists.at( -1 ).append( list );

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

            list = lists.at( -1 );

            const link = heading.querySelector( "a" ),
                li = document.createElement( "li" ),
                a = document.createElement( "a" );

            a.setAttribute( "href", link.getAttribute( "href" ) );
            a.textContent = link.textContent;
            a.classList.add( "link" );

            li.append( a );
            list.append( li );
        }

        return tocEl;
    }
}

new Theme();
