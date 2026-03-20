# Configuration Management Commands

The `config` command group allows you to list, batch export, import packages of different flavors such as Studio and OCDM packages.

## List Packages

Packages can be listed using the following command:

```bash
content-cli config list -p <sourceProfile>
```

The result will be printed in the console containing only the package name and key:

```bash
info:    Package1 - Key: "package-1"
```

By using the `--json` option, packages can be exported (saved) in an extended form as a json file in the current working directory.

```bash
content-cli config list -p <sourceProfile> --json
```

The name of the file will be printed in the console with the following format:

```bash
info:    File downloaded successfully. New filename: 9560f81f-f746-4117-83ee-dd1f614ad624.json
```

By using the --flavors option, you can filter which packages to list. The available flavors are: **STUDIO** and **OCDM**.

### List Packages with Dependencies

When using the listing command with the `--json` option, two additional options are available:

-  **--withDependencies**: This option will include the dependencies of the packages in the output.

```bash
content-cli config list -p <sourceProfile> --withDependencies
```

- **--packageKeys**: This option allows you to filter the packages by their keys. You can specify multiple package keys separated by spaces.

```bash
content-cli config list -p <sourceProfile> --packageKeys key1 ... keyN
[optional] –withDependencies
```

## Batch Export Packages

Packages can be exported using the following command:

```bash
content-cli config export -p <sourceProfile> --packageKeys key1 ... keyN
```

The `--keysByVersion` option can be used to export packages by specific version. You can specify multiple packages with version separated by spaces, in the format of 'packageKey.version'.
The `--withDependencies` option can be used to also export dependencies of the given packages.
The `--unzip` option can be used to unzip the exported packages into the current working directory.

Depending on the `--unzip` option used, a zip file, or a directory containing the exported packages, will be created in the current working directory containing:

```bash
exported_package_random_uuid/
├─ manifest.json
├─ variable.json
├─ studio.json
├─ package_key1-version.zip
├─ ...
├─ package_keyN-version.zip
```

### Git Integration for Export

The following **Git options** are available:

- `--gitProfile <gitProfileName>` – specifies the Git profile to use for exporting directly to a repository.
  If not specified, the default profile will be used.
- `--gitBranch <branchName>` – specifies the branch in the Github repository where the export will be pushed.

Example exporting to Git:

```bash
content-cli config export -p <sourceProfile> --packageKeys key1 key2 --gitProfile myGitProfile --gitBranch feature-branch
```

### Export Directory Structure

- manifest.json - File which contains the metadata of the exported packages.
- studio.json - File which contains the metadata of the exported packages in a format compatible with Studio.
- variables.json - File which contains the variables of the exported packages.
- exported packages directories - Directories containing the exported package files, each directory is named after the package key and the version.

Inside each exported package directory, the following files will be present:

- package.json - File which contains the configuration of the exported package.
- nodes/ - Directory containing the nodes of the exported package.

Inside the nodes directory, a file for each node will be present:

- node_key.json - File which contains the configuration of the exported node.

## Batch Import Packages

Packages can be imported using the following commands, if importing from a zip file:

```bash
content-cli config import -p <sourceProfile> -f <relative exported zip file path>
```

Where `-f` is the short hand operation for `--file`.
If importing from a directory containing the exported packages, the following command can be used:

```bash
content-cli config import -p <sourceProfile> -d <relative exported directory file path>
```

Where `-d` is the shorthand operation for `--directory`.
When packages with the same keys exist in the target team, the --overwrite option can be used for allowing overwriting of those packages. If the package in target environment contains unpublished changes, they are automatically saved under a new version. This allows you to audit, compare, or roll back to your previous state via the version history if needed.

```bash
content-cli config import -p <sourceProfile> -f <file path> --overwrite
```

### Git Integration for Import

The following **Git options** are available:

- `--gitProfile <gitProfileName>` – specifies the Git profile to use for importing directly from a repository.
  If not specified, the default profile will be used.
- `--gitBranch <branchName>` – specifies the branch in the Github repository from which to import.

Example importing from Git:

```bash
content-cli config import -p <sourceProfile> --gitProfile myGitProfile --gitBranch feature-branch
```

Finally, the result of this command will be a list of PostPackageImportData exported as a json file. The file name will be printed with the following message format:

```bash
info:    Config import report file: 9560f81f-f746-4117-83ee-dd1f614ad624.json
```

## Listing & Mapping Variables

### Listing Package Variables

Package variables (with assignments) can be listed with the following command:

```bash
content-cli config variables list -p <sourceProfile> --keysByVersion key1:version1 ... keyN:versionN
```

The --keysByVersion option should specify a list of key :(colon) version pairs. Alternatively, a json file path containing a list of key and version pairs can be used. The PackageKeyAndVersionPair for the file should have the following form:

```typescript
export interface PackageKeyAndVersionPair {
    packageKey: string;
    version: string;
}
```

Similar to the other listing commands, the --json option can be used for exporting (saving) the result as a json file.

### Listing staging package variables

To list **staging** (unpublished) variables from Pacman’s public API (per package key), use the `listStaging` subcommand with `--packageKeys`:

```bash
content-cli config variables listStaging -p <profile> --packageKeys <packageKey> [<packageKey> ...]
```

Optional `--variableType` filters by variable type (Pacman query parameter `type`).
Pacman returns one manifest object per package (`packageKey` and `variables`). With `--json`, the CLI writes a JSON array containing those manifests (one entry per requested package key).

### Listing Assignments

By using the list assignments command, possible assignment values for the target team can be fetched for each variable type. The list assignments command has the following format:

```bash
content-cli list assignments --type <type> --params <additionalFilteringParams>
```

The params argument should be passed in a key value format separated by commas with this specified format:

```bash
--params key1=value1,key2=value2,...,keyN=valueN
```

### Mapping Variables

After getting the variables list (with definitions and assignments in the source team) and the assignments (possible values on the target team), you can change the value of the source team to one of the options provided when listing assignments.
This mapping should be saved and then used during import.
Since the format of the variables.json file on import is the same JSON structure as the list variables result, you can either map the values to the variables.json file for each variable, or replace the variables.json file with the result of the listing & mapping altogether.
If the mapping of variables is skipped, you should delete the variables.json file before importing.

## Package Version

The **config versions** command group allows you to retrieve metadata information about specific package versions.

### Get Package Version

To get metadata for a specific package version, use the following command:

```bash
content-cli config versions get --packageKey <packageKey> --packageVersion <packageVersion>
```

For example, to get metadata for version 1.2.3 of a package:

```bash
content-cli config versions get --packageKey my-package --packageVersion 1.2.3
```

The command will display the version metadata in the console:

```bash
info:    Package Key: my-package-key
info:    Version: 1.2.3
info:    History ID: history-id
info:    Change Date: 2024-01-15T10:30:00.000Z
info:    Publish Date: 2024-01-15T11:00:00.000Z
info:    Publish Message: Initial release version
info:    Deployed: true
info:    Published By: user@example.com
```

Note: You can also use `LATEST` instead of a specific version to get the most recently created version:

```bash
content-cli config versions get --packageKey my-package --packageVersion LATEST
```

#### Export Version Metadata as JSON

To export the version metadata as a JSON file instead of displaying it in the console, use the `--json` option:

```bash
content-cli config versions get --packageKey <packageKey> --packageVersion <packageVersion> --json
```

## Finding Nodes

The **config nodes find** command allows you to retrieve information about a specific node within a package.

### Find a Staging Node

To find a specific node in a package, use the following command:

```bash
content-cli config nodes find --packageKey <packageKey> --nodeKey <nodeKey>
```

The command will display the node information in the console:

```bash
info:    ID: node-id-123
info:    Key: node-key
info:    Name: My Node
info:    Type: VIEW
info:    Package Node Key: package-node-key
info:    Parent Node Key: parent-node-key
info:    Created By: user@celonis.com
info:    Updated By: user@celonis.com
info:    Creation Date: 2025-10-22T10:30:00.000Z
info:    Change Date: 2025-10-22T15:45:00.000Z
info:    Flavor: STUDIO
```

### Find a Node with Configuration

By default, the node configuration is not included in the response. To include the node's configuration, use the `--withConfiguration` flag:

```bash
content-cli config nodes get --packageKey <packageKey> --nodeKey <nodeKey> --withConfiguration
```

When configuration is included, it will be displayed as a JSON string in the output:

```bash
info:    Configuration: {"key":"value","nested":{"field":"data"}}
```

### Find a Versioned Node

To find a specific node in a package by version, use the `--packageVersion` option:

```bash
content-cli config nodes get --packageKey <packageKey> --nodeKey <nodeKey> --packageVersion <packageVersion>
```

You can combine the `--packageVersion` and `--withConfiguration` options:

```bash
content-cli config nodes get --packageKey <packageKey> --nodeKey <nodeKey> --packageVersion <packageVersion> --withConfiguration
```

### Export Node as JSON

To export the node information as a JSON file instead of displaying it in the console, use the `--json` option:

```bash
content-cli config nodes get --packageKey <packageKey> --nodeKey <nodeKey> --json
```

You can combine options to export a versioned node with its configuration:

```bash
content-cli config nodes get --packageKey <packageKey> --nodeKey <nodeKey> --packageVersion <packageVersion> --withConfiguration --json
```

## Listing Nodes

The **config nodes list** command allows you to retrieve all nodes within a specific package version.

### List Nodes in a Package Version

To list all nodes in a specific package version, use the following command:

```bash
content-cli config nodes list --packageKey <packageKey> --packageVersion <packageVersion>
```

The command will display information for each node in the console as a JSON object:

```bash
info: {"id":"node-id-123","key":"node-key-1","name":"My First Node","type":"VIEW",...}
info: {"id":"node-id-456","key":"node-key-2","name":"My Second Node","type":"KNOWLEDGE_MODEL",...}
...
```

### Pagination

The response is paginated, and the page size can be controlled with the `--limit` and `--offset` options (defaults to 100 and 0 respectively).

```bash
content-cli config nodes list --packageKey my-package --packageVersion 1.2.3 --limit 10
content-cli config nodes list --packageKey my-package --packageVersion 1.2.3 --limit 10 --offset 10
```

### List Nodes with Configuration

By default, the node configuration is not included in the response. To include each node's configuration, use the `--withConfiguration` flag:

```bash
content-cli config nodes list --packageKey <packageKey> --packageVersion <packageVersion> --withConfiguration
```

### Export Nodes List as JSON

To export the nodes list as a JSON file, use the `--json` option:

```bash
content-cli config nodes list --packageKey <packageKey> --packageVersion <packageVersion> --json
```

You can combine options:

```bash
content-cli config nodes list --packageKey <packageKey> --packageVersion <packageVersion> --withConfiguration --json
content-cli config nodes list --packageKey my-package --packageVersion 1.2.3 --limit 50 --offset 100 --json
```

## Diffing Node Configurations

The **config nodes diff** command allows you to compare two versions of a node's configuration within a package.

### Diff Two Versions of a Node

To compare two versions of a node, use the following command:

```bash
content-cli config nodes diff --packageKey <packageKey> --nodeKey <nodeKey> --baseVersion <baseVersion> --compareVersion <compareVersion>
```

The command will display the differences in the console:

```bash
info:    Package Key: my-package
info:    Node Key: my-node
info:    Name: My Node
info:    Type: VIEW
info:    Parent Node Key: parent-node-key
info:    Change Date: 2025-10-22T15:45:00.000Z
info:    Updated By: 2025-10-22T15:45:00.000Z
info:    Change Type: CHANGED
info:    Changes: {"op":"replace","path":"/config/value","from":"/config/oldValue","value":{"newValue":"updated"},"fromValue":{"oldValue":"original"}}
info:    Metadata Changes: {"op":"add","path":"/metadata/tags","from":"","value":{"tags":["tag1","tag2"]},"fromValue":{}}
```

### Understanding Change Types

The diff command returns one of the following change types:

- **ADDED** - The node was newly created in the compare version
- **DELETED** - The node was removed in the compare version
- **CHANGED** - The node's configuration was modified between versions
- **UNCHANGED** - No changes detected between versions
- **INVALID** - The node configuration is invalid

### Changes Structure

The `changes` field contains configuration changes in JSON Patch format with the following fields:

- **op** - The operation performed (add, remove, replace)
- **path** - The JSON path where the change occurred
- **from** - The source path (for move operations)
- **value** - The new value after the change
- **fromValue** - The original value before the change

The `metadataChanges` field follows the same structure but represents changes to node metadata rather than configuration.

### Export Node Diff as JSON

To export the node diff as a JSON file, use the `--json` option:

```bash
content-cli config nodes diff --packageKey <packageKey> --nodeKey <nodeKey> --baseVersion <baseVersion> --compareVersion <compareVersion> --json
```

## Listing Node Dependencies

The **config nodes dependencies list** command allows you to retrieve all dependencies of a specific node within a package.

### List Dependencies of a Versioned Node

To list all dependencies of a node in a specific package version, use the following command:

```bash
content-cli config nodes dependencies list --packageKey <packageKey> --nodeKey <nodeKey> --packageVersion <version>
```

The command will display the dependencies in the console:

```bash
info:    Found 3 dependencies:
info:    {"packageKey":"dependency-package-1","key":"dependency-key-1","type":"ANALYSIS"}
info:    {"packageKey":"dependency-package-2","key":"dependency-key-2","type":"VIEW"}
info:    {"packageKey":"dependency-package-3","key":"dependency-key-3","type":"SKILL"}
```

If no dependencies are found, the command will display:

```bash
info:    No dependencies found for this node.
```

### List Dependencies of a Staging Node

The `--packageVersion` parameter is optional. When omitted, the command will retrieve dependencies from the staging (draft) version of the node:

```bash
content-cli config nodes dependencies list --packageKey <packageKey> --nodeKey <nodeKey>
```

### Export Node Dependencies as JSON

To export the node dependencies as a JSON file, use the `--json` option:

```bash
content-cli config nodes dependencies list --packageKey <packageKey> --nodeKey <nodeKey> --packageVersion <version> --json
content-cli config nodes dependencies list --packageKey <packageKey> --nodeKey <nodeKey> --json
```
