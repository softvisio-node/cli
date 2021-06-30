# Docs

Project documentation site generator.

## Guidelines

### Data types

-   Data type definition should be placed in angle brackets. Example: <string\>.
-   Primitive data type should be in the lowercase. Example: <boolean\>. List of primitive types:

    -   <any\> any data type;
    -   <string\>;
    -   <number\>;
    -   <integer\>;
    -   <boolean\>;
    -   <null\>;
    -   <symbol\>;
    -   <bigint\>;

-   Object data types and classes names should start with the capital letter. List of the embedded object data types:
    -   <Object\>;
    -   <Array\>;
    -   <Function\>;
    -   <Promise\>;

### Parameters definition

<!-- tabs:start -->

#### **Example**

-   `name` <string\> Mandatory parameter with the default value. **Default:** `null`.
-   `name` <string\> Enumerated string values. Possible values: `"left"`, `"right"`. **Default:** `"left"`.
-   `name?` <Object\> Non mandatory parameter.
-   `name` <string[]\> Typed array of strings.
-   `name` <Array\> Array of any types.
-   `name` <any[]\> Array of any types.
-   `name` <Promise\> | <boolean\> Parameter with the several allowed types.
-   `...args` <any\> Rest of the arguments.

#### **Source**

```markdown
-   `name` <string\> Mandatory parameter with the default value. **Default:** `null`.
-   `name` <string\> Enumerated string values. Possible values: `"left"`, `"right"`. **Default:** `"left"`.
-   `name?` <Object\> Non mandatory parameter.
-   `name` <string[]\> Typed array of strings.
-   `name` <Array\> Array of any types.
-   `name` <any[]\> Array of any types.
-   `name` <Promise\> | <boolean\> Parameter with the several allowed types.
-   `...args` <any\> Rest of the arguments.
```

<!-- tabs:end -->

For more examples refer to the [nodejs documentation](https://nodejs.org/api/).

-   If parameter is optional parameter name should be ended with the `"?"` character. Example: `name?`.

### Method definition

<!-- tabs:start -->

#### **Example**

method( options, ...args )

-   `options` <Object\> Options:
    -   `name1?` <string\> Optional parameter.
    -   `name2` <boolean\> Boolean parameter with the default value. **Default:** `true`.
-   `...args` <any\> Any number of the arguments of the any type.
-   Returns: <Promise\>

#### **Source**

```markdown
method( options, ...args )

-   `options` <Object\> Options:
    -   `name1?` <string\> Optional parameter.
    -   `name2` <boolean\> Boolean parameter with the default value. **Default:** `true`.
-   `...args` <any\> Any number of the arguments of the any type.
-   Returns: <Promise\>
```

<!-- tabs:end -->

## Config `.docs.config.yaml`

Config should be located in the `/.docs.config.yaml` or the `/docs/.docs.config.yaml` folders. Documentation will be generated relative to the config location.

### aliases

-   type: <Object\>
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

-   type: <string[]\>
-   default: `null`

Array of API schemas location (relative to the project root directory). Documentation for enumerated schemas will be generated during docs build process.

Example:

```yaml
api: [lib/api]
```

### changelog

-   type: <boolean\> | <string\>
-   default: `true`

Enable changelog integration. Possible values:

-   `false`: Disable changelog.
-   `true`: Use `CHANGELOG.md` in `main` branch.
-   <string\>: Changelog URL, relative URL resovled using your repo user content URL as base.

If changelog is enabled `/changelog` alias created automatically.

### favicon

-   type: <string\>
-   default: `null`

Set site favicon url. If not set but `logo` option is defined - your logo will be used as favicon.

### generateReadme

-   type: <boolean\>
-   default: `true`

Generate root `README.md` from docs `README.md`.

### logo

-   type: <boolean\> | <string\> | <Object\>
-   default: `false`

Set site logo. Possible values:

-   `false`: Logo is not used.
-   `true`: Logo URL `assets/logo.png`, height `50px`.
-   <string\>: Logo URL. Height will be set to `50px`.
-   <Object\>: Logo configuration object:
    -   `href` <string\> Logo URL.
    -   `width?` <integer\> Logo width. **Default:** `null`.
    -   `height?` <integer\> Logo height. **Default:** `50px`.

### name

-   type: <string\>
-   default: `name` field from the project `package.json`

Project name. Default value is `name` field value from the `package.json`.

### rpc

-   type: <string[]\>
-   default: `null`

Array of RPC schemas location (relative to the project root directory). Documentation for enumerated schemas will be generated during docs build process.

Example:

```yaml
rpc: [lib/rpc]
```

### siteURL

-   type: <string\>
-   default: your `git` upstream hosting pages url (if available)

Documentation site URL. Default value is your repository upstream pages url.

### subMaxLevel

-   type: <integer\>
-   default: `2`

Maximum headings level to display in the sidebar. Refer to the [docsify documentation](https://docsify.js.org/#/configuration?id=submaxlevel) for more details.

### types

-   type: <Object\>
-   default: Standard pre-defined `javascript` and `nodejs` data types.

Object of custom data types and links for your project. Example:

```yaml
types:
    File: "/file.md#Class: file"
    ExternalType: "http://example.com/types#external"
```

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
