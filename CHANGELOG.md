## 0.32.0 (2020-08-31)

-   deps updated
-   push branch and tags in single operation on release
-   check for detached head on release
-   help updated

## 0.31.1 (2020-08-18)

-   ls --dirty true by default

## 0.31.0 (2020-08-18)

-   ls --dirty option added
-   deps updated

## 0.30.0 (2020-08-07)

-   deps updated
-   pre-commit lint renamed files
-   .eslintrc.yaml removed
-   eslint don't ignore dotfiles
-   migrated to eslint 7

## 0.29.4 (2020-08-03)

-   update package-lock.json version on release

## 0.29.3 (2020-08-03)

-   update shrinkwrap version on release

## 0.29.2 (2020-08-03)

-   shrinkwrap added
-   deps updated

## 0.29.1 (2020-08-02)

-   docs yaml dump settings updated

## 0.29.0 (2020-08-02)

-   wiki commands added
-   git upstream urls updated

## 0.28.0 (2020-07-30)

-   docker build refactored

## 0.27.1 (2020-07-29)

-   git upstream url parser fixed

## 0.27.0 (2020-07-25)

-   workspace indexes added
-   named workspaces
-   priv / pub filter added
-   priv / pub label added

## 0.26.0 (2020-07-22)

-   allow to release project without changes (bump version)

## 0.25.2 (2020-07-21)

-   yaml comments parser fixed

## 0.25.1 (2020-07-18)

-   current release distance fixed

## 0.25.0 (2020-07-18)

-   git releaseDistance -> currentReleaseDistance
-   git id.release -> id.currentRelease
-   git getReleases combined with getId
-   git push status combined with id
-   release latest tag fixed
-   don't highlight release dispance for unreleased projects

## 0.24.0 (2020-07-18)

-   ls don't highlight release dispance for unreleased projects

## 0.23.0 (2020-07-18)

-   id command renamed to status

## 0.22.0 (2020-07-17)

-   show total changes for unreleased projects
-   lint for package fixed
-   lint directory patterns must include glob
-   lint patterns updated

## 0.21.0 (2020-07-16)

-   ansi color moved to @softvisio/core
-   upstream clone url fixed
-   id command added

## 0.20.3 (2020-07-16)

-   console log fixed

## 0.20.2 (2020-07-16)

-   console log fixed

## 0.20.1 (2020-07-15)

-   console log fixed

## 0.20.0 (2020-07-15)

-   wiki
-   use editor from user config to edit changelog
-   ls can list projects in all configured workspaces
-   ios icons names updated

## 0.19.1 (2020-07-14)

-   ios icons added

## 0.19.0 (2020-07-13)

-   docker build --single option added

## 0.18.5 (2020-07-13)

-   git options reordered in help
-   git sort releases in desc order
-   docker build logs added

## 0.18.4 (2020-07-12)

-   release publish root fixed

## 0.18.3 (2020-07-12)

-   relese - set latest tag only if release version is latest
-   missed spaces in log added
-   relese - check for master branch removed

## 0.18.2 (2020-07-12)

-   changelog format updated

## 0.18.1 (2020-07-12)

-   .eslintrc.yaml updated

## 0.18.0 (2020-07-11)

-   git install-hooks command added
-   pre-commit hook template added

## 0.17.1 (2020-07-11)

-   pre-commit checks that package.json exists before linting files

## 0.17.0 (2020-07-11)

-   pre-commit command added
-   ignoreUnsupported option renamed to processUnsupported
-   release --force option added
-   docker build --force option added
-   icons os filter added
-   detect file type using shebang
-   vim lint append extension depending on vim file type
-   use mime db for file type detection
-   lint config added to package.json
-   lint read config from the nearest package.json
-   write icons to root/resources if started from project
-   vim command renamed to rpc
-   git pre-commit hook refactored
-   src return status refactored
-   lint added "-" argument to read from stdin

## 0.16.0 (2020-07-08)

-   colorize lint output
-   git pre-commit hook added

## 0.15.0 (2020-07-08)

-   docker build command added
-   cli spec for release command fixed
-   ls output fixed
-   version prefix moved to constants
-   docker command added
-   set no as default choice for confirm release prompt
-   add missed trailing \n to changelog
-   git upstream added
-   use git version on release
-   update version in sub-projects and config.xml on release

## 0.14.0 (2020-07-08)

-   log command added
-   ls command added
-   util getProjectRoot() function added

## 0.13.0 (2020-07-07)

-   init
