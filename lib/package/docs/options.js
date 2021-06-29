import types from "#resources/types.js";

const DEFAULT_LOGO_HEIGHT = 50;
const DEFAULT_SUB_MAX_LEVEL = 2;

const PRISM_EMBEDDED = new Set( ["text", "javascript", "css", "html"] );
const PRISM_NAMES = {
    "shell": "bash",
};
const PRISM_ALIASES = {
    "js": "javascript",
    "md": "markdown",
    "sh": "shell",
    "txt": "text",
};

const LINKS = {
    "changelog": { "text": "Changelog", "href": "#/changelog" },
    "discussions": { "title": "Discussions", "iconCls": "far fa-comments" },
    "issues": { "title": "Issues", "iconCls": "fas fa-bug" },
    "npm": { "title": "NPM package", "iconCls": "fab fa-npm" },
    "theme": { "text": "Theme", "iconCls": "fas fa-adjust", "href": "#toggleTheme" },
};

export default class Options {
    #pkg;
    #config;
    #upstream;

    #prism = new Set();
    #logo;
    #changelogURL;
    #types;
    #usedTypes = {};

    static async new ( pkg, config ) {
        const upstream = await pkg.git.getUpstream();

        return new this( pkg, config, upstream );
    }

    constructor ( pkg, config, upstream ) {
        this.#pkg = pkg;
        this.#config = config;
        this.#upstream = upstream;
    }

    get location () {
        return this.#config.location;
    }

    get locationPath () {
        if ( this.location === "root" ) return this.#pkg.root;
        else if ( this.location === "docs" ) return this.#pkg.root + "/docs";
        else return null;
    }

    get generateReadme () {
        return this.#config.generateReadme;
    }

    get api () {
        return this.#config.api;
    }

    get rpc () {
        return this.#config.rpc;
    }

    get npmName () {
        return this.#pkg.name;
    }

    get docsify () {
        const options = {
            "name": this.#config.name || this.#pkg.name,
            "repo": this.#upstream.homeURL,
            "loadSidebar": true,
            "auto2top": true,
            "relativePath": true,
            "maxLevel": 2, // max toc level for no-sidebar mode
            "externalLinkTarget": "_self",
            "subMaxLevel": this.#config.subMaxLevel ?? DEFAULT_SUB_MAX_LEVEL,
            "search": {
                "depth": 3,
            },
            "tabs": {},
            "alias": {},
            "logo": null,
            "types": Object.isEmpty( this.#usedTypes ) ? null : this.#usedTypes,
        };

        // logo
        if ( this.logo ) {
            options.logo = this.logo.href;

            if ( this.logo.width ) options.logo += ` width="${this.logo.width}"`;
            if ( this.logo.height ) options.logo += ` height="${this.logo.height}"`;
        }

        // alias
        if ( this.#config.aliases ) options.alias = { ...this.#config.aliases };
        if ( this.changelogURL ) options.alias["/changelog"] = this.changelogURL;

        return this.#sortObject( options );
    }

    get logo () {
        if ( this.#logo == null ) {
            if ( this.#config.logo ) {
                if ( this.#config.logo === true ) {
                    this.#logo = {
                        "href": "assets/logo.png",
                        "height": DEFAULT_LOGO_HEIGHT,
                    };
                }
                else if ( typeof this.#config.logo === "string" ) {
                    this.#logo = {
                        "href": this.#config.logo,
                        "height": DEFAULT_LOGO_HEIGHT,
                    };
                }
                else {
                    this.#logo = { ...this.#config.logo };
                }
            }
            else {
                this.#logo = false;
            }
        }

        return this.#logo;
    }

    get favicon () {
        if ( this.#config.favicon ) {
            return this.#config.favicon;
        }
        else if ( this.logo ) {
            return this.logo.href;
        }
        else {
            return null;
        }
    }

    get changelogURL () {
        if ( this.#changelogURL == null ) {
            if ( this.#config.changelog !== false ) {
                if ( this.#config.changelog === true || this.#config.changelog == null ) {
                    this.#changelogURL = this.#upstream.getChangelogURL();
                }
                else {
                    this.#changelogURL = new URL( "./" + this.#config.changelog, this.#upstream.rawURL + "/" ).href;
                }
            }
            else {
                this.#changelogURL = false;
            }
        }

        return this.#changelogURL;
    }

    get links () {
        const links = [];

        if ( this.changelogURL ) links.push( this.#buildLinkTag( LINKS.changelog ) );
        if ( this.#upstream.discussionsURL ) links.push( this.#buildLinkTag( LINKS.discussions, this.#upstream.discussionsURL ) );
        if ( this.#upstream.issuesURL ) links.push( this.#buildLinkTag( LINKS.issues, this.#upstream.issuesURL ) );
        if ( this.#pkg.npmURL ) links.push( this.#buildLinkTag( LINKS.npm, this.#pkg.npmURL ) );

        links.push( this.#buildLinkTag( LINKS.theme ) );

        return links;
    }

    get siteURL () {
        return this.#config.siteURL || this.#upstream.docsURL;
    }

    get prism () {
        return [...this.#prism].sort();
    }

    get types () {
        if ( !this.#types ) {
            this.#types = { ...types, ...( this.#config.types || {} ) };

            for ( const type in this.#types ) {
                if ( !this.#types[type] ) continue;

                // external link
                if ( this.#types[type].startsWith( "http://" ) || this.#types[type].startsWith( "https://" ) || this.#types[type].startsWith( "//" ) ) continue;

                const idx = this.#types[type].indexOf( "#" );

                if ( idx < 0 ) continue;

                const hash = this.#types[type]
                    .substr( idx )
                    .trim()
                    .toLowerCase()
                    .replace( /<[^>]+>/g, "" )
                    .replace( /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, "" )
                    .replace( /\s/g, "-" )
                    .replace( /-+/g, "-" )
                    .replace( /^(\d)/, "_$1" );

                this.#types[type] = this.#types[type].substring( 0, idx ) + "#" + hash;
            }
        }

        return this.#types;
    }

    // public
    addType ( type ) {
        this.#usedTypes[type] = this.types[type];
    }

    addLanguage ( name ) {

        // resolve name by alias
        name = PRISM_ALIASES[name] || name;

        const prismName = PRISM_NAMES[name] || name;

        if ( !PRISM_EMBEDDED.has( prismName ) ) this.#prism.add( prismName );

        return name;
    }

    // private
    #buildLinkTag ( link, href ) {
        var tag = `<a href="${href || link.href}"${link.title ? ` title="${link.title}"` : ""}>`;

        const text = [];
        if ( link.iconCls ) text.push( `<i class="${link.iconCls}"></i>` );
        if ( link.text ) text.push( link.text );

        tag += text.join( " " );

        tag += "</a>";

        return tag;
    }

    #sortObject ( object ) {
        return Object.fromEntries( Object.keys( object )
            .sort()
            .map( key => {
                if ( Object.isPlain( object[key] ) ) {
                    return [key, this.#sortObject( object[key] )];
                }
                else {
                    return [key, object[key]];
                }
            } ) );
    }
}
