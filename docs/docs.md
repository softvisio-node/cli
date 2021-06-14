# Docs

Project documentation site generator.

## Config `.config.xml`

Config should be location in `/docs/.config.xml`.

### aliases

-   type: `Object`
-   default: `null`

Set of routes aliases in `alias`: `url` form. `alias` can be string or regular expression. For more detaild pls refer to the [docsify documentation](https://docsify.js.org/#/configuration?id=alias).

Example:

```yaml
aliases:
    info: http://example.com/info.md
```

Use alias from markdown:

```markdown
[link text](/alias)
```

Use alias from html:

```html
<a href="#alias">link text</a>
```

### api

-   type: `Array`
-   default: `null`

Array of API schemas location (relative to the project root directory). Documentation for enumerated schemas will be generated during docs build process.

Example:

```yaml
api: [lib/api]
```

### changelog

-   type: `Boolean`|`String`
-   default: `true`

Enable changelog integration. Possible values:

-   `true` - use `CHANGELOG.md` in `main` branch;
-   `string` - changelog URL, relative URL resovled using your repo user content URL as base;

If changelog is enabled `/changelog` alias created automatically.

### favicon

-   type: `String`
-   default: `null`

Set site favicon url. If not set but `logo` option is defined - your logo will be used as favicon.

### generateReadme

-   type: `Boolean`
-   default: `true`

Generate root `README.md` from docs `README.md`.

### logo

-   type: `Boolean`, `String`, `Object`
-   default: `false`

Set site logo. Possible values:

-   `false` - Logo is not used.
-   `true` - Logo URL `assets/logo.png`, height `50px`.
-   `String` - Logo URL. Height will be set to `50px`.
-   `Object` - Logo configuration object:
    -   `href` - Logo URL.
    -   `width` - Logo width. Default: `null`.
    -   `height` - Logo height. Default: `50px`.

### name

-   type: `String`
-   default: `name` field from the project `package.json`

Project name. Default value is `name` field value from the `package.json`.

### rpc

-   type: `Array`
-   default: `null`

Array of RPC schemas location (relative to the project root directory). Documentation for enumerated schemas will be generated during docs build process.

Example:

```yaml
rpc: [lib/rpc]
```

### siteURL

-   type: `String`
-   default: your `git` upstream hosting pages url (if available)

Documentation site URL. Default value is your repository upstream pages url.

### subMaxLevel

-   type: `Integer`
-   default: 2

Maximum headings level to display in the sidebar. Refer to the [docsify documentation](https://docsify.js.org/#/configuration?id=submaxlevel) for more details.

## FAQ

### How to add a link to the external file to the sidebar

You need to use aliases.

`.config.yaml`:

```yaml
aliases:
    "/external-file-alias": "https://external/file.md"
```

`_sidebar.md`:

```markdown
[External file](/external-file-alias)
```
