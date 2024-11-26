# Conventional commits

Commit message structure: `<type>(<scope>)!: <description>`

- `type` Commit type. Allowed characters: `[a-z0-9]`. `Required`.
- `scope` Commit scope. Allowed characters: `[a-z0-9]`. `Optional`.
- `"!"` before `":"` means, that commit is breaking change. `Optional`.
- `description` Arbitrary description. `Required`.

Default commit types:

- `"chore"`
- `"feat"` - new feature
- `"fix"` - bug fix

Examples:

```shell
# bug fix
git commit -m"fix: commit description"

# feature with scope
git commit -m"feat(core): commit description"

# breaking change feature with scope
git commit -m"feat(core)!: commit description"
```

## Config

`package.json`:

```json
{
    "commits": {
        "strict": true,
        "types": ["custom1", "custom2"],
        "scopeRequired": true,
        "scopes": ["core", "web"]
    }
}
```

### strict

- type: {boolean}
- default: `true`

Allow conventional commits only.

### types

- type: {Array}
- default: `[]`

Allowed commit types. If empty any type is allowed.

### scopeRequired

- type: {boolean}
- default: `false`

Scope is required.

### scopes

- type: {Array}
- default: `[]`

List of the allowed scopes. If empty any scope is allowed.

## Links

- [Conventional commits specification](https://www.conventionalcommits.org/en/v1.0.0/)
- [vuejs commit convention](https://github.com/vuejs/vue/blob/dev/.github/COMMIT_CONVENTION.md)
- [vue-cli commit convention](https://github.com/vuejs/vue-cli/blob/dev/.github/COMMIT_CONVENTION.md)
