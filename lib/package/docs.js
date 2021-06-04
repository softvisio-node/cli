import fs from "#core/fs";
import url from "url";

const DOCS_LOCATION = "docs";

export default class Docs {
    #rootPackage;

    constructor ( rootPackage ) {
        this.#rootPackage = rootPackage;
    }

    get rootPackage () {
        return this.#rootPackage;
    }

    get isExists () {
        return !!this.#rootPackage.docsConfig;
    }

    // public
    async build () {
        const { "default": APISchema } = await import( "#core/app/api/schema" ),
            { "default": ejs } = await import( "ejs" ),
            location = this.#rootPackage.root + "/" + DOCS_LOCATION,
            config = this.#rootPackage.docsConfig;

        process.stdout.write( `Building documentation ... ` );

        // check docs config
        if ( !this.isExists ) return this.#done( result( [404, `Documentation config wasn't found.`] ) );

        // generate api schema
        if ( config.api ) {

            // generate docs
            for ( const source in config.api ) {
                const schema = new APISchema( url.pathToFileURL( this.#rootPackage.root + "/" + source ) );

                const res = await schema.loadSchema();

                if ( !res.ok ) return this.#done( res );

                const fileTree = await schema.generate( config.api[source].options );

                // update files
                const dir = location + "/" + config.api[source].target;

                if ( fs.existsSync( dir ) ) fs.rmSync( dir, { "recursive": true } );

                await fileTree.write( dir );
            }
        }

        const fileTree = new fs.FileTree(),
            options = await this.#buildOptions();

        // XXX generate default readme
        // XXX generate default sidebar

        const readmePath = location + "/README.md";

        // generate README.md
        if ( config.generateReadme !== false && fs.existsSync( readmePath ) ) {
            const template = fs.resolve( "#resources/templates/docs/README.md", import.meta.url );

            // XXX replace relative urls
            options.readmeContent = fs.readFileSync( readmePath );

            fileTree.add( { "path": "README.md", "data": await ejs.renderFile( template, options ) } );
        }

        // generate index.html
        const template = fs.resolve( "#resources/templates/docs/index.html", import.meta.url );

        fileTree.add( { "path": DOCS_LOCATION + "/index.html", "data": await ejs.renderFile( template, options ) } );

        await fileTree.write( this.#rootPackage.root );

        return this.#done( result( 200 ) );
    }

    // private
    #done ( res ) {
        console.log( res + "" );

        return res;
    }

    // XXX
    async #buildOptions () {
        const pkg = this.#rootPackage,
            config = pkg.docsConfig,
            upstream = await pkg.git.getUpstream(),
            options = {
                "siteURL": config.siteURL || upstream.pagesURL,
                "readmeContent": null,
                "changelogURL": null,
                "sourceURL": upstream.homeURL,
                "issuesURL": upstream.issuesURL,
                "discussionsURL": upstream.discussionsURL,
                "npmURL": this.#rootPackage.npmURL,
                "links": [],
                "docsify": {
                    "name": config.name || pkg.name,
                    "repo": upstream.homeURL,
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
                },
            };

        // changelog
        if ( config.changelog !== false ) {
            if ( config.changelog === true || config.changelog == null ) {
                options.changelogURL = new URL( "main/CHANGELOG.md", upstream.rawURL + "/" ).href;
            }
            else {
                options.changelogURL = new URL( "./" + config.changelog, upstream.rawURL + "/" ).href;
            }
        }

        // logo
        if ( config.logo ) {
            if ( config.logo === true ) {
                options.docsify.logo = "assets/logo.png height='80px'";
            }
            else if ( typeof config.logo === "string" ) {
                options.docsify.logo = config.logo;
            }
            else {
                options.docsify.logo = config.logo.href;

                if ( config.logo.width ) options.docsify.logo += ` width='${config.logo.width}'`;
                if ( config.logo.height ) options.docsify.logo += ` height='${config.logo.width}'`;
            }
        }

        // favicon
        // XXX

        // aliases XXX

        // top links
        if ( options.changelogURL ) options.links.push( { "title": "CHANGELOG", "iconCls": null, "link": options.changelogURL } );
        if ( options.discussionsURL ) options.links.push( { "alt": "Discussions", "iconCls": "far fa-comments", "link": options.discussionsURL } );
        if ( options.issuesURL ) options.links.push( { "alt": "Issues", "iconCls": "fas fa-bug", "link": options.issuesURL } );
        if ( options.npmURL ) options.links.push( { "alt": "NPM package", "iconCls": "fab fa-npm", "link": options.npmURL } );
        if ( options.sourceURL ) options.links.push( { "alt": "Source code", "iconCls": "fab fa-github", "link": options.sourceURL } );

        return options;
    }
}
