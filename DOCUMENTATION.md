# Content CLI as a tool for managing content in the EMS

-   [Content CLI Core Features](#content-cli-core-features)
    -   [Using profiles](#using-profiles)
    -   [Pull command](#pull-command)
    -   [Push command](#push-command)
-   [Using content-cli inside Studio](#using-content-cli-inside-studio)
    -   [Pull/Push packages from/to Studio](#pullpush-packages-fromto-studio)
        -   [Pull package for EMS Store](#pull-package-for-ems-store)
    -   [Pull/Push individual assets from/to Studio](#pullpush-individual-assets-fromto-studio)
    -   [Overwrite Package In Studio](#overwrite-package-in-studio)
    -   [List all spaces in Studio](#list-all-spaces-in-studio)
    -   [List all packages in Studio](#list-all-packages-in-studio)
    -   [Asset options for Analysis](#asset-options-for-analysis)

## Content CLI Core Features

Content CLI has three core functionalities:

**Profile:** The CLI connects to the EMS environments through profiles. 
For each of the commands you can specify which profile you want to use. 
This makes it powerful in the sense that you can pull something from 
let's say team1.cluser1 and push it directly to team2.cluster2 easily. 
You can create a profile using the following command:

```
content-cli profile create
```

**Pull:** This feature allows you to download content from the EMS to 
your local machine.Let's take Studio package as an example. These 
can be exported in the EMS as ZIP files that contain all package assets. 
By using the following command using the package key and profile you 
have created, you will pull the ZIP file.

```
content-cli pull package -p team1.cluster1 --key my-package
```

**Push:** This feature allows you to push a content file to a team 
in the EMS. To continue the last example, you can use the following 
command to push he previously pulled package in another team.

```
content-cli push package -p team2.cluster2 --spaceKey my-space -f package_my-package.zip
```

You can still explore the full capabilities of Content CLI and the 
list of options for the different commands by using the `-h` option
in your command.

```
content-cli -h
content-cli pull package -h
```

### Using profiles

As mentioned above, **Content CLI** allows creating profiles for
different environments. A profile consists of a name, URL to your EMS
team and an API token. Each of the above mentioned commands include
a ***--profile*** flag which allows you selecting a profile by its name.

Creating a profile is done by using the ***content-cli profile create***
command. The CLI will ask for a name, a URL and an API token. If the
provided information is correct, it will create a profile with the
provided data. After successfully creating a profile, you can view 
your profiles by running the ***content-cli profile list*** command.

| Note: Please do not use blanks in profile names |
|-------------------------------------------------|

#### API Token

You can choose between two different options when asked for an API token. 
The first option is to use an API key, which identifies the user that created 
the key. You can generate an API key in the `Edit Profile` section of your EMS 
user account, under `API-Keys`. The second options is to use an Application Key,
which is treated as a new user with separate configurable permissions. You can 
generate an Application key in the `Team Settings` section of your EMS account, 
under `Applications`. After creating an Application, you can assign it different
permissions based on how much power you want to give to the key owner.

#### When to create profiles

So let's say you have a Studio package in [https://my-team.eu-1.celonis.cloud]() 
and you want to push the same one to [http://my-other-team.eu-1.celonis.cloud]().
You can create two profiles: one for my-team and one for my-other-team.
Then, when you pull the package, you use the my-team profile and you
push the downloaded file again, but now using the my-other-team profile.

You also have the possibility to set a profile as default, so that you
don't have to set the profile flag over and over again when you use
commands. You can do so by using ***content-cli profile default
\<YOUR\_PROFILE\_NAME\>***. With the list command, you can also see
which of your commands is set to default.

### Pull command

By using ***content-cli pull***, you can pull content from an EMS team.
The CLI pulls that content to the current directory from where you are
using the CLI.

If you type ***content-cli pull --help***, you can see all available
sub-commands for ***pull***, which are basically the entity types which
you are able to pull.

```
content-cli pull --help
``` 

If you want to pull an analysis, you use ***content-cli pull
analysis***. If you again use the ***--help*** flag here, you see all
the options needed for pulling an entity. for pulling an analysis, it
looks something like this:  
  
```
content-cli pull analysis --help
```

Different entities require different options. For example: to push an
analysis, you also need to specify to which workspace you want to push
that analysis. Therefore, you should make use of the flag ***--workspaceId***
to specify to which workspace it should be pushed and so on.

### Push command

In the opposite to the pull command, with ***content-cli push*** you can
push content to the EMS. Similarly to the pull command, with the
***--help*** functionality you can see all the possible entities which
you can push.

```
content-cli push --help
```

#### Push .CTP files to the EMS

_This functionality supports .CTP files generated on a cpm4 instance version 4.6+._ 

By using ***content-cli push ctp***, you can push **.CTP** files from your local machine to the EMS, like the following examples:

```
// Push the analysis extracted from the .CTP file
content-cli push ctp -p my-profile-name --file path-to-ctp-file --password ctp-file-password --pushAnalysis
```

```
// Push the data models extracted from the .CTP file 
content-cli push ctp -p my-profile-name --file path-to-ctp-file --password ctp-file-password --pushDataModels
```

## Using Content CLI inside Studio

### Pull/Push packages from/to Studio

By using content-cli pull package, you can pull the published version of packages from Studio to
your local machine (You can use the ***--draft*** option to pull the draft version
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

Additionally, you can use content-cli push packages to push all the
packages you have in your current directory in one go, like the
following example:

```
// Pull multiple packages
content-cli push packages -p my-other-profile --spaceKey my-space
```

#### Pull draft package

By default, the `pull package` command will pull the last published version 
of the package. You can use the ***--draft*** option to pull the draft version
of your package, like the following example:

```
// Pull draft version of package
content-cli pull package -p my-profile-name --key ap-operational-app --draft
```

#### Pull package for EMS Store

You can use the ***--store*** option to pull the package including the
store metadata you need to upload the package to the EMS Store, like the
following example:

```
// Pull package with store metadata
content-cli pull package -p my-profile-name --key ap-operational-app --store
```

| Note: Pulling the package with the store metadata will only work if your package has no dependencies. |
|-------------------------------------------------------------------------------------------------------|

### Pull/Push individual assets from/to Studio

The pull/push asset commands work the same way as for other content in
the EMS. By using content-cli pull asset, you can pull individual assets
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

Additionally, you can use content-cli push assets to push all the 
assets you have in your current directory to a single package,
like the following example:

```
// Push multiple assets to package
content-cli push assets -p my-profile-name --package test-package
```
| Note: You can find the unique key of the asset/package in the action menu. |
|----------------------------------------------------------------------------|

### Overwrite Package In Studio

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

### List all spaces in Studio
With this command you can retrieve a list of all spaces within a team.
The command takes your permissions into consideration and only lists the
spaces you have access to.

-   It is also possible to download spaces in JSON format by adding '--json' option.

```
content-cli list spaces -p <your-chosen-profile>
```

### List all packages in Studio 

With this command you can retrieve a list of all packages within a team.
The command takes your permissions into consideration and only lists the
packages you have access to. 

-   It is also possible to download packages in JSON format by adding '--json' option.
-   It is also possible to include package dependencies by adding '--includeDependencies' flag

```
content-cli list packages -p <your-chosen-profile>
```

### List all data pools of the team

With this command you can retrieve a list of all data pools within a team.
The command takes your permissions into consideration and only lists the
pools you have access to. 

-   It is also possible to download packages in JSON format by adding '--json' option.

```
content-cli list data-pools -p <your-chosen-profile>
```

### List all assets in Studio 

With this command you can retrieve a list of all assets with the --assetType option within a team.
The command takes your permissions into consideration and only lists the
assets you have access to. 

-   It is also possible to download assets in JSON format by adding '--json' option.

```
content-cli list assets -p <your-chosen-profile> --assetType SCENARIO
```

### Asset options for Analysis

For migration use cases, when pulling analysis from Process Analytics
you can use the --asset option to pull the content in a generic format
that Studio accepts. As an example command for pulling an analysis with
the  --asset option would be: 

```
// Pull analysis as an asset
content-cli pull analysis -p my-profile-name --id 73d39112-73ae-4bbe-8051-3c0f14e065ec --asset
```

After you have pulled your workflows/analysis with the --asset option,
it's time to push them inside Studio. You can do accomplish this using
the same command as with pushing other assets to Studio:

```
// Push analysis to Studio
content-cli push asset -p my-profile-name -f asset_73d39112-73ae-4bbe-8051-3c0f14e065ec.yaml --package my-package-key
```

| Note: Pushing analysis from Process Analytics to Studio will only work if you have used the ***--asset*** option when pulling. |

### Pull and Push Analysis Bookmarks in Studio

Enable users to pull and push bookmarks using content-cli. For pulling analysis bookmarks
you can specify --type (shared/all), and by default it fetches user bookmarks.

```
// Pull analysis bookmarks
content-cli pull bookmarks --profile my-profile-name --id 73d39112-73ae-4bbe-8051-3c0f14e065ec --type shared
```

After you have pulled your analysis bookmarks with the --type option,
it's time to push them inside analysis in different package. You can do accomplish this using
the same command as with pushing other assets to Studio:

```
// Push analysis to Studio
content-cli push bookmarks -p my-profile-name --id 73d39112-73ae-4bbe-8051-3c0f14e065ec --file studio_analysis_bookmarks_39c5bb7b-b486-4230-ab01-854a17ddbff2.json 
```

### Data Pool push / pull commands

#### Pull Data Pool

In order to pull a Data Pool you can execute the following command:

```node content-cli.js pull data-pool --id <replace-with-pool-id> --profile local -v2 true```

* Note: The ```-v2``` flag enables you to export Data Pool data that can then later be used to 'Batch Push multiple Data Pools'.
Without this flag, the export uses the old implementation that is not compatible with Batch Push.

#### Batch Push multiple Data Pools

In order to batch push a list of data pools use the following command:

```node content-cli.js push data-pools --batchImport true -f ./request.json --profile dev1```

* The ```request.json``` file contains the batch import JSON request.
* The ```--batchImport``` flag enables import of multiple Data Pools together with data shared accross Data Pools
  (for example, imported data connections, cross-pool scheduling triggers). If this flag 
isn't used, then the old implementation is used which doesn't support the import of shared
objects. Thus, for the old implementation, the imported Data Pools that rely on shared objects
will not be functional.
* The command outputs a 
* The JSON request looks the following way:

```
{
    "targetTeamDomain": "dev1",
    "dataPoolImports": [
        {
            "sourcePoolId": "850728cc-c679-4925-954a-87fb39abb12b",
            "targetPoolId": "80a1389d-50c5-4976-ad6e-fb5b7a2b5517",
            "dataSourceMappings": {
                "69e7c6b8-a36c-48ee-8dba-9bb89baf41dd": "98b4b2d9-898d-4b72-aeb9-ebd87c097cb3",
                "2ec72366-c84f-4896-9f7a-9db1891aeb54": "082a754f-e971-44d8-993a-053707e4a307"
            },
            "dataPool": {...}
        },
        {
            "sourcePoolId": "510fde4e-4a53-4a4e-9331-31038bcaf891",
            "targetPoolId": "1b9b368b-e0df-4e74-99e8-59e2febe9687",
            "dataSourceMappings": {
                "e9359d63-5ccf-4f0d-8da3-24cda8a42c01": "096c0280-4cb9-4279-a003-b77698287aba",
                "8a1b2a1e-1015-4c7b-8cdc-b8efea1ad894": "e971e8d1-96d4-488a-9e1d-6cff0c4a9813"
            },
            "dataPool": {...}
        }
    ]
}
```

In the above JSON:
1. ```targetTeamDomain```: the destination team domain, into which the data pools data is pushed.
2. ```sourcePoolId```: the source Data Pool ID.
2. ```targetPoolId```: the target Data Pool ID to which the source Data Pool ID should be mapped to.
3. ```dataSourceMappings```: the source Data Source ID to destination Data Source ID mappings.
4. ```dataPool```: the Data Pool data exported via the ```pull data-pool -v2 true``` command.


|--------------------------------------------------------------------------------------------------------------------------------|
