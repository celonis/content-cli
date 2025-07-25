# Content CLI as a tool for managing content in the Celonis Platform

-   [Content CLI Core Features](#content-cli-core-features)
    -   [Using profiles](#using-profiles)
    -   [Pull command](#pull-command)
    -   [Push command](#push-command)
-   [Using content-cli inside Studio](#using-content-cli-inside-studio)
    -   [Pull/Push packages from/to Studio](#pullpush-packages-fromto-studio)
        -   [Pull package for Celonis Marketplace](#pull-package-for-celonis-marketplace)
    -   [Pull/Push individual assets from/to Studio](#pullpush-individual-assets-fromto-studio)
    -   [Overwrite Package In Studio](#overwrite-package-in-studio)
    -   [Batch Export packages from Studio](#export-multiple-packages-at-once-from-studio)
    -   [Batch import packages into Studio](#importing-multiple-packages-into-studio)
    -   [List all spaces in Studio](#list-all-spaces-in-studio)
    -   [List all packages in Studio](#list-all-packages-in-studio)
    -   [List assignments](#list-assignments)
    -   [Asset options for Analysis](#asset-options-for-analysis)
    -   [Action Flows commands](#action-flows-commands)
        - [Analyze Action Flows](#analyze-action-flows)
        - [Export Action Flows](#export-action-flows)
-   [Data Pool export / import commands](#data-pool-export--import-commands)
    - [Export Data Pool](#export-data-pool)
    - [Batch Import multiple Data Pools](#batch-import-multiple-data-pools)
-   [Updating connection properties](#updating-connection-properties-programmatically)

## Content CLI Core Features

Content CLI has three core functionalities:

**Profile:** The CLI connects to the Celonis Platform through profiles. 
For each of the commands you can specify which profile you want to use. 
This makes it powerful in the sense that you can pull something from 
let's say team1.cluster1 and push it directly to team2.cluster2 easily. 
You can create a profile using the following command:

```
content-cli profile create
```

**Pull:** This feature allows you to download content from the Celonis Platform to 
your local machine.Let's take a Studio package as an example. These 
can be exported in the Celonis Platform as ZIP files that contain all package assets. 
By using the following command using the package key and profile you 
have created, you will pull the ZIP file.

```
content-cli pull package -p team1.cluster1 --key my-package
```

**Push:** This feature allows you to push a content file to a team 
in the Celonis Platform. To continue the last example, you can use the following 
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
different environments. A profile consists of a name, URL to your Celonis Platform
team and an API token. Each of the above mentioned commands include
a ***--profile*** flag which allows you selecting a profile by its name.

Creating a profile is done by using the ***content-cli profile create***
command. The CLI will ask for a name, a URL and an API token. If the
provided information is correct, it will create a profile with the
provided data. After successfully creating a profile, you can view 
your profiles by running the ***content-cli profile list*** command.

| Note: Please do not use blanks in profile names |
|-------------------------------------------------|

#### Profile Types
You can create profiles of two types: using OAuth (Device Code 
or Client Credentials) or using API Tokens (Application Key / API Key):

##### OAuth

OAuth supports with two grant types: Device Code & Client Credentials. 

With Device Code, creating the profile will trigger an authorization flow 
(using the OAuth 2.0 Device code). You will be prompted to follow an authorization 
link where you must authorize the **Content CLI** to be able to access the Celonis Platform environment 
on your behalf. 

With Client Credentials, you need to provide the credentials (Client ID, Client Secret) configured for your OAuth client. 
You can create and configure an OAuth clients in the `Admin & Settings` section of your Celonis account, under `Applications`. 
The OAuth client needs to have scopes configured based on the area of commands they're using, e.g.: 
- For Studio commands: studio, 
- Data Pipeline/Data Pool commands: integration.data-pools,
After creating an OAuth client, you should assign it the permissions necessary for the respective commands. More 
information on registering OAuth clients can be found [here](https://docs.celonis.com/en/registering-oauth-client.html).

##### API Token

You can choose between two different options when asked for an API token. 
The first option is to use an API key, which identifies the user that created 
the key. You can generate an API key in the `Edit Profile` section of your Celonis 
user account, under `API-Keys`. The second options is to use an Application Key,
which is treated as a new user with separate configurable permissions. You can 
generate an Application key in the `Team Settings` section of your Celonis account, 
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

By using ***content-cli pull***, you can pull content from a Celonis Platform team.
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
push content to the Celonis Platform. Similarly to the pull command, with the
***--help*** functionality you can see all the possible entities which
you can push.

```
content-cli push --help
```

#### Push .CTP files to the Celonis Platform

_This functionality supports .CTP files generated on a cpm4 instance version 4.6+._ 

By using ***content-cli push ctp***, you can push **.CTP** files from your local machine to the Celonis Platform, like the following examples:

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

#### Pull package for Celonis Marketplace

You can use the ***--store*** option to pull the package including the
store metadata you need to upload the package to the Celonis Marketplace, like the
following example:

```
// Pull package with store metadata
content-cli pull package -p my-profile-name --key ap-operational-app --store
```

| Note: Pulling the package with the store metadata will only work if your package has no dependencies. |
|-------------------------------------------------------------------------------------------------------|

### Pull/Push individual assets from/to Studio

The pull/push asset commands work the same way as for other content in
the Celonis Platform. By using content-cli pull asset, you can pull individual assets
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

### Batch export packages from Studio

You can use the export packages command to batch export packages from studio.

```
//Batch export packages
content-cli export packages -p <profileName> --packageKeys <package1> <package2>
```

You can use the --includeDependencies flag to also export the dependencies of the specified packages.

```
//Batch export packages with dependencies
content-cli export packages -p <profileName> --packageKeys <package1> <package2> --includeDependencies
```

If you don't want to export any Action Flows with the packages you can use --excludeActionFlows flag

```
//Batch export packages with excluded Action Flows
content-cli export packages -p <profileName> --packageKeys <package1> <package2> --includeDependencies --excludeActionFlows
```

### Batch import packages into Studio

You can use the `import packages` command to batch import packages that were exported using `export packages` at once into studio.

```
//Batch import packages
content-cli import packages -p <profileName> --file <exportedPackagesFile>
```

You can also use the `--spaceMappings` flag to provide a mapping of packages to spaces in target team:

```
// Example usage of spaceMappings
content-cli import packages -p <profileName> --file <exportedPackagesFile> --spaceMappings <packageKey1>:<targetSpaceKey1> <packageKey2>:<targetSpaceKey2> ...
```

By default, all imported package variables will be assigned values as defined in the `manifest.yml` file of the exported packages. 
Alternatively, if you want to update only the dataModel variables, you can do so by using the --dataModelMappingsFile option and 
providing the output file from the data pool import command.

```
// Example usage of dataModelMappingsFile
content-cli import packages -p <profileName> --file <exportedPackagesFile> --dataModelMappingsFile <dataModelMappingsFile>
```

**Note: The --dataModelMappingsFile option is deprecated and will be removed in future releases.**

By default, you can not overwrite a package in the target team. To do this you can use the overwrite flag --overwrite

```
// Example usage of dataModelMappingsFile
content-cli import packages -p <profileName> --file <exportedPackagesFile> --dataModelMappingsFile <dataModelMappingsFile> --overwrite
```

If you want to overwrite a package but not the Action Flows inside that package you can use the --excludeActionFlows flag

```
// Example usage of excludeActionFlows
content-cli import packages -p <profileName> --file <exportedPackagesFile> --dataModelMappingsFile <dataModelMappingsFile> --overwrite --excludeActionFlows
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
-   When the JSON format option is used, also possible to include package dependencies by adding '--includeDependencies' flag
-   When the JSON format option is used, also possible to filter packages by adding '--packageKeys' parameter 

```
content-cli list packages -p <your-chosen-profile>
content-cli list packages -p <profileName> --json --packageKeys <package1> <package2>
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

### List assignments

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

### Action Flows commands

#### Analyze Action Flows

The analyze operation returns the metadata of Action Flows for one package together with their dependencies. Dependencies
could be webhooks, data structures, variables and other.

In order to analyze Action Flows you can execute the following command:

```
content-cli analyze action-flows -p my-profile-name --packageId <replace-with-package-id> --outputToJsonFile
```

The ```--outputToJsonFile``` is optional. If specified, the analyze result is saved in a JSON file (```metadata.json```). The
command output will give you all the details.

#### Export Action Flows

The export operation allows export of Action Flows of one package together with their dependencies. Dependencies
could be webhooks, data structures, variables and other.

In order to pull Action Flows you can execute the following command:

```
content-cli export action-flows -p my-profile-name --packageId <replace-with-package-id> -f <replace-with-metadata-file-name>
```

_Note_: The ```-f``` is optional. If specified, it will attach the metadata file to the exported zip.
This file is expected to be received by the ```action-flows analyze``` command, and manually be populated with the mappings source to target package.

### Data Pool export / import commands

#### Export Data Pool

The export operation allows export of a Data Pool together with its dependencies. Dependencies
could be imported data sources and related objects, data source exports, scheduling triggers and other.

In order to pull a Data Pool you can execute the following command:

```content-cli export data-pool --id <replace-with-pool-id> --profile local --outputToJsonFile```

_Note_: The ```--outputToJsonFile``` is optional. If specified, the exported data pool is saved in a JSON file. The 
command output will give you all the details.

#### Batch Import multiple Data Pools

The import operation allows import of multiple Data Pools together with their dependencies. Dependencies
could be imported data sources and related objects, data source exports, scheduling triggers and other.

In order to batch push a list of data pools use the following command:

```content-cli import data-pools --jsonFile ./request.json --profile dev1 --outputToJsonFile```

#### Input

* The ```request.json``` file contains the batch import JSON request.
* The JSON request looks the following way:

```
{
    "targetTeamDomain": "dev1",
    "dataPoolImportRequests": [
        {
            "targetPoolId": "80a1389d-50c5-4976-ad6e-fb5b7a2b5517",
            "dataSourceMappings": {
                "69e7c6b8-a36c-48ee-8dba-9bb89baf41dd": "98b4b2d9-898d-4b72-aeb9-ebd87c097cb3",
                "2ec72366-c84f-4896-9f7a-9db1891aeb54": "082a754f-e971-44d8-993a-053707e4a307"
            },
            "dataPool": {...}
        },
        {
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
4. ```dataPool```: the Data Pool data exported via the `export data-pool` command

#### Output

The command outputs an import report.

If the `--outputToJsonFile` option is specified, the import report will be written to a JSON file.
The command output will give you all the details.

### Updating connection properties programmatically

In some cases, it might be required to update connection properties in data pools programmatically. 
Examples include governance and compliance reasons or mechanisms which are rotating credentials automatically.

With the `get` and `set` commands, users can update properties from connections in an automated fashion.

You can get a list of all connections in a data pool using the `list` command: 

```content-cli list connection --profile <profile> --dataPoolId <dataPoolId>```

Depending on the type of source, the updatable properties may differ. You can use the following command to
get a full list of properties for a data source connection:

```content-cli get connection --profile <profile> --dataPoolId <dataPoolId> --connectionId <connectionId>```

You can then update the property you want to update using the `set` command:

```content-cli set connection --profile <profile> --dataPoolId <dataPoolId> --connectionId <connectionId> --property <property> --value <value>```

|--------------------------------------------------------------------------------------------------------------------------------|
