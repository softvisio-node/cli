import fetch from "#core/fetch";
import { objectIsEmpty, objectIsPlain } from "#core/utils";
import yaml from "#core/yaml";
import DEFAULT_TYPES from "#resources/docs-types.js";

const DEFAULT_LOGO_HEIGHT = 50;
const DEFAULT_SUB_MAX_LEVEL = 2;

const PRISM_EMBEDDED = new Set( [ "text", "javascript", "css", "html" ] );
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
    "discussions": { "title": "Discussions", "iconCls": "fa-regular fa-comments" },
    "issues": { "title": "Issues", "iconCls": "fa-solid fa-bug" },
    "npm": { "title": "NPM package", "iconCls": "fa-brands fa-npm" },
    "theme": { "text": "Theme", "iconCls": "fa-solid fa-adjust", "href": "#toggleTheme" },
};

export default class Options {
    #package;
    #config;
    #upstream;

    #prism = new Set();
    #logo;
    #changelogUrl;
    #types;
    #usedTypes = {};

    constructor ( pkg ) {
        this.#package = pkg;
        this.#config = this.#package.cliConfig.docs;
        this.#upstream = pkg.git.upstream;
    }

    // properties
    get generateReadme () {
        return this.#config.generateReadme;
    }

    get app () {
        return this.#config.app;
    }

    get npmName () {
        return this.#package.name;
    }

    get docsify () {
        const options = {
            "name": this.#config.name || this.#package.name,
            "repo": this.#upstream.homeUrl,
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
            "types": this.#usedTypes,
        };

        // logo
        if ( this.logo ) {
            options.logo = this.logo.href;

            if ( this.logo.width ) options.logo += ` width="${ this.logo.width }"`;
            if ( this.logo.height ) options.logo += ` height="${ this.logo.height }"`;
        }

        // alias
        if ( this.#config.aliases ) options.alias = { ...this.#config.aliases };
        if ( this.changelogUrl ) options.alias[ "/changelog" ] = this.changelogUrl;

        // cleanup
        if ( !options.logo ) delete options.logo;
        if ( objectIsEmpty( options.types ) ) delete options.types;
        if ( objectIsEmpty( options.alias ) ) delete options.alias;

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

    get changelogUrl () {
        if ( this.#changelogUrl == null ) {
            if ( this.#config.changelog !== false ) {
                if ( this.#config.changelog === true || this.#config.changelog == null ) {
                    this.#changelogUrl = this.#upstream.getChangelogUrl();
                }
                else {
                    this.#changelogUrl = new URL( "./" + this.#config.changelog, this.#upstream.rawUrl + "/" ).href;
                }
            }
            else {
                this.#changelogUrl = false;
            }
        }

        return this.#changelogUrl;
    }

    get links () {
        const links = [];

        if ( this.changelogUrl ) links.push( this.#buildLinkTag( LINKS.changelog ) );
        if ( this.#upstream.discussionsUrl ) links.push( this.#buildLinkTag( LINKS.discussions, this.#upstream.discussionsUrl ) );
        if ( this.#upstream.issuesUrl ) links.push( this.#buildLinkTag( LINKS.issues, this.#upstream.issuesUrl ) );
        if ( this.#package.npmUrl ) links.push( this.#buildLinkTag( LINKS.npm, this.#package.npmUrl ) );

        links.push( this.#buildLinkTag( LINKS.theme ) );

        return links;
    }

    get siteUrl () {
        return this.#config.siteUrl || this.#upstream.docsUrl;
    }

    get prism () {
        return [ ...this.#prism ].sort();
    }

    // public
    async getTypes () {
        if ( !this.#types ) {

            // add default types
            this.#types = { ...DEFAULT_TYPES };

            // add external types
            if ( this.#config.externalTypes ) {
                for ( let url of this.#config.externalTypes ) {
                    const [ owner, name, branch ] = url.split( "/" );

                    url = new URL( `https://raw.githubusercontent.com/${ owner }/${ name }/${ branch || "main" }/cli.config.yaml` );

                    const res = await fetch( url );

                    // http request error
                    if ( !res.ok ) throw `Unable to load external types from: ${ url.href }`;

                    let config;

                    try {
                        config = yaml.parse( await res.text() );
                    }
                    catch {
                        throw `Unable to parse: ${ url.href }`;
                    }

                    // external config has no types defined
                    if ( !config.docs?.types ) continue;

                    for ( const type in config.docs.types ) {

                        // register type
                        this.#types[ type ] = config.docs.types[ type ];

                        // empty type
                        if ( !this.#types[ type ] ) continue;

                        // external link
                        if ( this.#types[ type ].startsWith( "http://" ) || this.#types[ type ].startsWith( "https://" ) || this.#types[ type ].startsWith( "//" ) ) continue;

                        // prepare external link
                        this.#types[ type ] = `https://${ owner }.github.io/${ name }/#` + this.#buildTypeUrl( this.#types[ type ] );
                    }
                }
            }

            // add own types
            if ( this.#config.types ) {
                for ( const type in this.#config.types ) {
                    this.#types[ type ] = this.#config.types[ type ];

                    // empty type
                    if ( !this.#types[ type ] ) continue;

                    // external link
                    if ( this.#types[ type ].startsWith( "http://" ) || this.#types[ type ].startsWith( "https://" ) || this.#types[ type ].startsWith( "//" ) ) continue;

                    const idx = this.#types[ type ].indexOf( "#" );

                    if ( idx < 0 ) continue;

                    const hash = this.#types[ type ]
                        .slice( idx )
                        .trim()
                        .toLowerCase()
                        .replaceAll( /<[^>]+>/g, "" )
                        .replaceAll( /[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~\u2000-\u206F\u2E00-\u2E7F]/g, "" )
                        .replaceAll( /\s/g, "-" )
                        .replaceAll( /-+/g, "-" )
                        .replace( /^(\d)/, "_$1" );

                    this.#types[ type ] = this.#types[ type ].slice( 0, idx ) + "#" + hash;
                }
            }
        }

        return this.#types;
    }

    async addType ( type ) {
        const types = await this.getTypes();

        this.#usedTypes[ type ] = types[ type ];
    }

    addLanguage ( name ) {

        // resolve name by alias
        name = PRISM_ALIASES[ name ] || name;

        const prismName = PRISM_NAMES[ name ] || name;

        if ( !PRISM_EMBEDDED.has( prismName ) ) this.#prism.add( prismName );

        return name;
    }

    // private
    #buildLinkTag ( link, href ) {
        var tag = `<a href="${ href || link.href }"${ link.title
            ? ` title="${ link.title }"`
            : "" }>`;

        const text = [];
        if ( link.iconCls ) text.push( `<i class="${ link.iconCls }"></i>` );
        if ( link.text ) text.push( link.text );

        tag += text.join( " " );

        tag += "</a>";

        return tag;
    }

    #sortObject ( object ) {
        return Object.fromEntries( Object.keys( object )
            .sort()
            .map( key => {
                if ( objectIsPlain( object[ key ] ) ) {
                    return [ key, this.#sortObject( object[ key ] ) ];
                }
                else {
                    return [ key, object[ key ] ];
                }
            } ) );
    }

    #buildTypeUrl ( type ) {
        var [ path, id ] = type.split( "#" );

        if ( id ) {
            id = id
                .trim()
                .toLowerCase()
                .replaceAll( /<[^>]+>/g, "" )
                .replaceAll( /[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~\u2000-\u206F\u2E00-\u2E7F]/g, "" )
                .replaceAll( /\s/g, "-" )
                .replaceAll( /-+/g, "-" )
                .replace( /^(\d)/, "_$1" );
        }

        return path + ( id
            ? "?id=" + id
            : "" );
    }
}
