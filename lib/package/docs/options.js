const DEFAULT_LOGO_HEIGHT = 80;

const LINKS = {
    "changelog": { "title": "CHANGELOG", "href": "#changelog" },
    "discussions": { "alt": "Discussions", "iconCls": "far fa-comments" },
    "issues": { "alt": "Issues", "iconCls": "fas fa-bug" },
    "theme": { "title": "THEME", "iconCls": "fas fa-adjust", "href": "javascript:" },
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

    get docsify () {
        const options = {
            "name": this.#config.name || this.#pkg.name,
            "repo": this.#upstream.homeURL,
            "loadSidebar": true,
            "auto2top": true,
            "relativePath": true,
            "maxLevel": 3,
            "externalLinkTarget": "_self",
            "subMaxLevel": 3,
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
        if ( this.changelogURL ) options.alias[".*?/changelog"] = this.changelogURL;

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
                    this.#changelogURL = new URL( "main/CHANGELOG.md", this.#upstream.rawURL + "/" ).href;
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

        links.push( this.#buildLinkTag( LINKS.theme ) );

        return links;
    }

    get siteURL () {
        return this.#config.siteURL || this.#upstream.pagesURL;
    }

    // XXX
    // get readmeContent () {
    //     return null;
    // }

    // private
    #buildLinkTag ( link, href ) {
        var tag = `<a href="${href || link.href}"${link.alt ? ` alt="${link.alt}"` : ""}>`;

        const title = [];
        if ( link.iconCls ) title.push( `<i class="${link.iconCls}"></i>` );
        if ( link.title ) title.push( link.title );

        tag += title.join( " " );

        tag += "</a>";

        return tag;
    }
}
