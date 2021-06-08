const DEFAULT_DOCS_LOCATION = "docs";
const DEFAULT_LOGO_HEIGHT = 50;
const EMBEDDED_PRISM = new Set( ["javascript", "css", "html"] );
const DEFAULT_PRISM = ["json", "json5", "yaml", "bash"];

const LINKS = {
    "changelog": { "text": "Change log", "href": "#/changelog" },
    "discussions": { "title": "Discussions", "iconCls": "far fa-comments" },
    "issues": { "title": "Issues", "iconCls": "fas fa-bug" },
    "npm": { "title": "NPM package", "iconCls": "fab fa-npm" },
    "theme": { "text": "Theme", "iconCls": "fas fa-adjust", "href": "#toggleTheme" },
};

export default class Options {
    #pkg;
    #config;
    #upstream;

    #logo;
    #changelogURL;

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
        return this.#pkg.root + "/" + ( this.#config.location || DEFAULT_DOCS_LOCATION );
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
            "maxLevel": 0,
            "externalLinkTarget": "_self",
            "subMaxLevel": 2,
            "search": {
                "depth": 3,
            },
            "tabs": {},
            "alias": {},
            "logo": null,
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

        return options;
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
        return this.#config.siteURL || this.#upstream.pagesURL;
    }

    get prism () {
        const prism = new Set();

        DEFAULT_PRISM.filter( item => !EMBEDDED_PRISM.has( item ) ).forEach( item => prism.add( item ) );

        if ( this.#config.prism ) this.#config.prism.filter( item => !EMBEDDED_PRISM.has( item ) ).forEach( item => prism.add( item ) );

        return prism;
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
}
