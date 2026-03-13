# Studio Commands

## Pull/Push Packages from/to Studio

By using content-cli pull package, you can pull the published version of packages from Studio to
your local machine (You can use the ***--draft*** option to pull the draft version
of your package, see example below), like the following example:

```
// Pull single package
content-cli pull package -p my-profile-name --key ap-operational-app
```

After you have pulled your packages, you can push them into another team
using the following command:

```
// Push single package
content-cli push package -p my-other-profile --spaceKey my-space -f package_ap-operational-app.zip
```

Additionally, you can use content-cli push packages to push all the
packages you have in your current directory in one go, like the
following example:

```
// Pull multiple packages
content-cli push packages -p my-other-profile --spaceKey my-space
```

### Pull Draft Package

By default, the `pull package` command will pull the last published version
of the package. You can use the ***--draft*** option to pull the draft version
of your package, like the following example:

```
// Pull draft version of package
content-cli pull package -p my-profile-name --key ap-operational-app --draft
```

### Pull Package for Celonis Marketplace

You can use the ***--store*** option to pull the package including the
store metadata you need to upload the package to the Celonis Marketplace, like the
following example:

```
// Pull package with store metadata
content-cli pull package -p my-profile-name --key ap-operational-app --store
```

| Note: Pulling the package with the store metadata will only work if your package has no dependencies. |
|-------------------------------------------------------------------------------------------------------|

## Pull/Push Individual Assets from/to Studio

The pull/push asset commands work the same way as for other content in
the Celonis Platform. By using content-cli pull asset, you can pull individual assets
from Studio to your local machine, and an example of it would be:

```
// Pull single asset from package
content-cli pull asset -p my-profile-name --key package-test.km-test
```

After you have pulled your assets, you can push them into another
package using the following command:

```
// Push single asset to package
content-cli push asset -p my-profile-name -f asset_km-test.yml --package new-package
```

Additionally, you can use content-cli push assets to push all the
assets you have in your current directory to a single package,
like the following example:

```
// Push multiple assets to package
content-cli push assets -p my-profile-name --package test-package
```

| Note: You can find the unique key of the asset/package in the action menu. |
|----------------------------------------------------------------------------|

## Overwrite Package in Studio

When you use overwrite the following is to be taken into consideration:

-   Assets that exist in the destination package, but not in the source
    package, will be removed
-   The data model variable assignment of the destination package will
    not be overwritten, it will remain the same
-   The permissions set on the destination package will remain. This is
    helpful to not have to assign the same permissions again
-   The package dependencies of the destination package will be
    overwritten with the ones of the source package
-   The URLs of the assets from the destination package will not change,
    they remain the same

```
// Overwrite a Package
content-cli push package -p my-profile-name --spaceKey my-space -f <path-to-my-local-package> --overwrite
```

## Listing

### List All Spaces in Studio

With this command you can retrieve a list of all spaces within a team.
The command takes your permissions into consideration and only lists the
spaces you have access to.

-   It is also possible to download spaces in JSON format by adding '--json' option.

```
content-cli list spaces -p <your-chosen-profile>
```

### List All Packages in Studio

With this command you can retrieve a list of all packages within a team.
The command takes your permissions into consideration and only lists the
packages you have access to.

-   It is also possible to download packages in JSON format by adding '--json' option.
-   When the JSON format option is used, also possible to include package dependencies by adding '--includeDependencies' flag
-   When the JSON format option is used, also possible to filter packages by adding '--packageKeys' parameter

```
content-cli list packages -p <your-chosen-profile>
content-cli list packages -p <profileName> --json --packageKeys <package1> <package2>
```

### List All Data Pools of the Team

With this command you can retrieve a list of all data pools within a team.
The command takes your permissions into consideration and only lists the
pools you have access to.

-   It is also possible to download packages in JSON format by adding '--json' option.

```
content-cli list data-pools -p <your-chosen-profile>
```

### List All Assets in Studio

With this command you can retrieve a list of all assets with the --assetType option within a team.
The command takes your permissions into consideration and only lists the
assets you have access to.

-   It is also possible to download assets in JSON format by adding '--json' option.

```
content-cli list assets -p <your-chosen-profile> --assetType SCENARIO
```

### List Assignments

With this command you can retrieve a list of possible variable assignment values for a variable type.
The command takes your permissions into consideration and only lists the values you have access to.

-   It is also possible to download packages in JSON format by adding '--json' option.

```
content-cli list assignments -p <your-chosen-profile> --variableType <your-chosen-variable-type>
```

Currently, only variables of type DATA_MODEL and CONNECTION are supported.

The command includes an optional --params option for additional value filtering.
Parameters should be provided in CSV format.
For instance, when dealing with variables of type CONNECTION, you can use the --params option to retrieve
only the potential assignment values for connections with the appName 'Celonis' using the following command:

```
content-cli list assignments -p <your-chosen-profile> --variableType CONNECTION --params appName=Celonis
```

## Pull and Push Analysis Bookmarks

Enable users to pull and push bookmarks using content-cli. For pulling analysis bookmarks
you can specify --type (shared/all), and by default it fetches user bookmarks.

```
// Pull analysis bookmarks
content-cli pull bookmarks --profile my-profile-name --id 73d39112-73ae-4bbe-8051-3c0f14e065ec --type shared
```

After you have pulled your analysis bookmarks with the --type option,
it's time to push them inside analysis in different package. You can accomplish this using
the same command as with pushing other assets to Studio:

```
// Push analysis to Studio
content-cli push bookmarks -p my-profile-name --id 73d39112-73ae-4bbe-8051-3c0f14e065ec --file studio_analysis_bookmarks_39c5bb7b-b486-4230-ab01-854a17ddbff2.json
```

### Asset Options for Analysis

Different entities require different options. For example: to push an
analysis, you also need to specify to which workspace you want to push
that analysis. Use the ***--help*** flag to see all options for a specific command:

```
content-cli pull analysis --help
content-cli push analysis --help
```
