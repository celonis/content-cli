# Configuration Management Commands

The `config` command group allows you to list, batch export, import packages of different flavors such as Studio and OCDM packages.

## Permissions

All `config` commands run against the Pacman API and are subject to the same permission checks the platform applies in the UI. The required permission depends on the **flavor** of the target package:

| Package flavor | Required permission |
|---|---|
| **Studio** (Studio packages and their assets) | **Edit package** permission on the package |
| **OCDM** (OCDM packages and their assets) | **Edit** (admin) permission on the **data pool** the OCDM package is connected to |

This applies to every command that reads or modifies a single package or its nodes, including:

- `config nodes get`, `config nodes list`, `config nodes diff`, `config nodes dependencies list`
- `config nodes create`, `config nodes update`, `config nodes archive`
- `config variables list`
- `config versions get`, `config versions create`
- `config validate`, `config diff`
- `config export`, `config import`, `config metadata export`

If the authenticated profile does not have the required permission, the command fails with `Access is Denied`.

`config list` is the one exception: instead of failing, it **filters out packages the profile does not have permission to access**. If a package you expect to see is missing from the list, the most likely cause is missing edit permission on the package (Studio) or on its connected data pool (OCDM).

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

By using the `--flavors` option, you can filter which packages to list. The available flavors are: **STUDIO** and **OCDM**.

To list staging packages instead of deployed packages use the `--staging` option. Please note that this flag is not compatible with the below options.

### List Packages with Dependencies

When using the listing command with the `--json` option, two additional options are available:

-  **--withDependencies**: This option will include the dependencies of the packages in the output.

```bash
content-cli config list -p <sourceProfile> --withDependencies
```

- **--packageKeys**: This option allows you to filter the packages by their keys. You can specify multiple package keys separated by spaces.

```bash
content-cli config list -p <sourceProfile> --packageKeys key1 ... keyN
[optional] –-withDependencies
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

### Validate During Import

Add `--validate` to `config import` to run validation against each node **before** the import is committed:

```bash
content-cli config import -p <sourceProfile> -d <export_dir> --validate --overwrite
```

`config import --validate` runs the **SCHEMA** layer only. It does **not** run BUSINESS-layer checks (PQL parsing, data-model availability, KPI uniqueness, etc.). To run business validation, use [`config validate`](#validate-package-configurations) after the import.

## Validate Package Configurations

The `config validate` command validates the **staging (draft) version** of a package by sending its nodes through one or more validation layers. The command runs against the Pacman validate API and returns a structured report of errors, warnings, and info findings.

This command requires **edit permission** on the target package (see [Permissions](#permissions)).

```bash
content-cli config validate --packageKey <packageKey>
```

By default, only the `SCHEMA` layer is run. The console output looks like:

```bash
info:    Validation result: VALID
info:    Errors: 0 | Warnings: 0 | Info: 0
```

If there are findings, each one is printed on its own line with the severity, node key, asset type, message, and code:

```bash
info:    Validation result: INVALID
info:    Errors: 1 | Warnings: 0 | Info: 0
info:
info:      ERROR   my-knowledge-model (SEMANTIC_MODEL) - $.requiredField: is missing but it is required [REQUIRED_PROPERTY_MISSING]
```

### Validation Layers

The `--layers` option selects which validation layers to run. Multiple layers can be passed and are executed in a single request; their findings are merged into one report.

| Layer | What it checks | Owner |
|---|---|---|
| `SCHEMA` | Asset-schema conformance of each node's `configuration` field — required properties, enum values, type checks, conditional schemas. | Asset registry |
| `BUSINESS` | Asset-type-specific business rules — for `SEMANTIC_MODEL`, e.g. PQL parsing, data-model availability, KPI uniqueness. Rules live in the owning asset service. | Owning asset service (e.g. `cloud-semantic-layer` for Knowledge Models) |

Currently `SCHEMA` and `BUSINESS` are the only layers accepted by the Pacman API. Other values are rejected with a `400 layers.unsupported` error.

To run both layers:

```bash
content-cli config validate --packageKey <packageKey> --layers SCHEMA BUSINESS
```

### Validate Specific Nodes

By default, every node in the package's staging version is validated. To restrict the scope to a subset of nodes, use `--nodeKeys`:

```bash
content-cli config validate --packageKey <packageKey> --nodeKeys node-key-1 node-key-2
```

### Export Validation Report as JSON

Use `--json` to write the full validation report to a JSON file in the current working directory instead of printing it to the console:

```bash
content-cli config validate --packageKey <packageKey> --layers SCHEMA BUSINESS --json
```

The filename is printed on success:

```bash
info:    Validation report file: config_validate_report_9560f81f-f746-4117-83ee-dd1f614ad624.json
```

The JSON report has the shape:

```typescript
interface ValidationReport {
    packageKey: string;
    valid: boolean;
    summary: { errors: number; warnings: number; info: number };
    results: ValidationResult[];
}

interface ValidationResult {
    layer: "SCHEMA" | "BUSINESS";
    severity: "ERROR" | "WARNING" | "INFO";
    nodeKey: string;
    assetType: string;
    path: string;
    code: string;
    message: string;
    suggestion?: string;
}
```

## Listing & Mapping Variables

### Listing Package Variables

Variables can be read for **versioned packages** or for the **unversioned** configuration of packages (identified by package key only). Use either the published flow (`--keysByVersion` / `--keysByVersionFile`) or the unversioned flow (`--packageKeys`); combining them is not supported and the command will fail.

**Output (console and `--json`).** For both flows, each package is represented the same way: `packageKey`, `variables` (definitions and values), and—**only for versioned packages**—`version`. Without `--json`, each package is printed as one JSON object per line. With `--json`, the result is written to a file as a **JSON array** of those objects. For unversioned packages, `version` is simply omitted.

**Versioned packages** — `config variables list` with `--keysByVersion` or `--keysByVersionFile`:

```bash
content-cli config variables list -p <sourceProfile> --keysByVersion key1:version1 ... keyN:versionN
```

The `--keysByVersion` option should specify a list of `key:version` pairs. Alternatively, pass a JSON file path with `--keysByVersionFile`. Each entry in the file should match:

```typescript
export interface PackageKeyAndVersionPair {
    packageKey: string;
    version: string;
}
```

**Unpublished configuration** — `config variables list` with `--packageKeys`:

```bash
content-cli config variables list -p <profile> --packageKeys <packageKey> [<packageKey> ...]
```

Use `--json` with either flow to export the array to a file (see **Output** above).

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

The **config versions** command group allows you to retrieve metadata information about specific package versions, and to create new versions.

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

### Create Package Version

To create a new version for a package, use the following command:

```bash
content-cli config versions create --packageKey <packageKey> --packageVersion <packageVersion>
```

For example, to create version 1.2.0 with a summary of changes:

```bash
content-cli config versions create --packageKey my-package --packageVersion 1.2.0 --summaryOfChanges "Added new analysis views"
```

The command will display the created version details in the console:

```bash
info:    Successfully created version 1.2.0 for package my-package
info:    Version: 1.2.0
info:    Package Key: my-package
info:    Summary of Changes: Added new analysis views
info:    Creation Date: 2025-03-19T10:00:00.000Z
info:    Created By: user@example.com
```

#### Version Bump Option

Instead of specifying an explicit version, you can use `--versionBumpOption PATCH` to automatically bump the patch version:

```bash
content-cli config versions create --packageKey my-package --versionBumpOption PATCH --summaryOfChanges "Bug fixes"
```

When using `--versionBumpOption PATCH`, the `--packageVersion` option is ignored and the patch version is automatically incremented. The default value for `--versionBumpOption` is `NONE`, which requires the `--packageVersion` option to be provided.

Note: You must provide either `--packageVersion` or `--versionBumpOption PATCH`, but not both.

#### Node Filter

By default, all nodes in the package are included in the created version. To selectively include only specific nodes, use the `--nodeFilterKeys` option:

```bash
content-cli config versions create --packageKey my-package --packageVersion 2.0.0 --nodeFilterKeys node-key-1 node-key-2
```

#### Export Created Version as JSON

To export the created version response as a JSON file instead of displaying it in the console, use the `--json` option:

```bash
content-cli config versions create --packageKey <packageKey> --packageVersion <packageVersion> --json
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

## Creating a Node

The **config nodes create** command creates a new node in the **staging (draft) version** of a package. Use it to add a single asset (View, Knowledge Model, Skill, etc.) to an existing package without going through the full package import flow.

This command requires **edit permission** on the target package (see [Permissions](#permissions)).

### Create a Node from a JSON Payload

The node payload can be provided either inline as a JSON string with `--body`, or as a path to a JSON file with `-f` / `--file`. Exactly one of these options must be provided.

```bash
content-cli config nodes create --packageKey <packageKey> -f <path-to-node.json>
```

```bash
content-cli config nodes create --packageKey <packageKey> --body '{"key":"...","name":"...","parentNodeKey":"...","type":"...","configuration":{}}'
```

### Payload Format

The payload must follow the `SaveNodeTransport` shape required by the Pacman public API:

| Field | Required | Description |
|---|---|---|
| `key` | yes | Unique key of the new node within the package. Must not collide with any existing (including archived) node key in the same package. |
| `name` | yes | Human-readable name of the node. |
| `parentNodeKey` | yes | Key of the parent node. To attach the node directly under the package root, use the package key. |
| `type` | yes | Node type (e.g. `VIEW`, `KNOWLEDGE_MODEL`, `SKILL`). Must match a node type that is valid for the package's flavor. |
| `configuration` | no | Object containing the type-specific configuration of the node. |
| `schemaVersion` | no | Schema version of the configuration. Required for node types that use schema-based validation. |
| `invalidConfiguration` | no | Stringified configuration to store as-is when `invalidContent` is `true`. Reserved for special migration / recovery flows. |
| `invalidContent` | no | Mark the node as having invalid content. Reserved for special migration / recovery flows. |

A minimal example payload (`my-view.json`):

```json
{
  "key": "my-new-view",
  "name": "My New View",
  "parentNodeKey": "my-package",
  "type": "VIEW",
  "configuration": {}
}
```

On success, the command prints the created node's metadata to the console:

```bash
info:    ID: node-id-123
info:    Key: my-new-view
info:    Name: My New View
info:    Type: VIEW
info:    Package Node Key: my-package
info:    Parent Node Key: my-package
info:    Created By: user@celonis.com
info:    Updated By: user@celonis.com
info:    Creation Date: 2025-10-22T10:30:00.000Z
info:    Change Date: 2025-10-22T10:30:00.000Z
info:    Flavor: STUDIO
```

### Validate Without Persisting

Use `--validate` to run the same validation the Pacman API applies on create, **without** persisting the node. This is useful in CI pipelines to check a payload before committing to the change.

```bash
content-cli config nodes create --packageKey <packageKey> -f <path-to-node.json> --validate
```

If validation succeeds, the command prints:

```bash
info:    Validation successful for node <key> in package <packageKey>.
```

If validation fails, the command exits with a non-zero status and prints the validation errors returned by Pacman.

### Export Created Node as JSON

To write the created node's metadata to a JSON file instead of printing it to the console, add `--json`:

```bash
content-cli config nodes create --packageKey <packageKey> -f <path-to-node.json> --json
```

## Updating a Node

The **config nodes update** command updates an existing node in the **staging (draft) version** of a package. The update is a full replacement of the mutable node fields — the payload represents the desired state of the node, not a partial patch.

This command requires **edit permission** on the target package (see [Permissions](#permissions)).

### Update a Node from a JSON Payload

As with create, the payload can be provided inline with `--body` or via a file with `-f` / `--file`. Exactly one of these options must be provided.

```bash
content-cli config nodes update --packageKey <packageKey> --nodeKey <nodeKey> -f <path-to-node.json>
```

### Payload Format

The payload must follow the `UpdateNodeTransport` shape required by the Pacman public API:

| Field | Required | Description |
|---|---|---|
| `name` | yes | Human-readable name of the node. |
| `parentNodeKey` | yes | Key of the parent node. Use the package key to keep / move the node directly under the package root. |
| `configuration` | no | Object containing the type-specific configuration of the node. |
| `schemaVersion` | no | Schema version of the configuration. Required for node types that use schema-based validation. |
| `invalidConfiguration` | no | Stringified configuration to store as-is when `invalidContent` is `true`. Reserved for special migration / recovery flows. |
| `invalidContent` | no | Mark the node as having invalid content. Reserved for special migration / recovery flows. |

Note that `key` and `type` are **not** part of the update payload. They are immutable for an existing node — to change them you must archive the node and create a new one.

A minimal example payload:

```json
{
  "name": "My Renamed View",
  "parentNodeKey": "my-package",
  "configuration": {}
}
```

On success, the command prints the updated node's metadata in the same format as `config nodes create`.

### Validate Without Persisting

`--validate` runs the same validation the Pacman API applies on update, without persisting the change. Useful for pre-flight checks in CI:

```bash
content-cli config nodes update --packageKey <packageKey> --nodeKey <nodeKey> -f <path-to-node.json> --validate
```

If validation succeeds, the command prints:

```bash
info:    Validation successful for node <nodeKey> in package <packageKey>.
```

### Export Updated Node as JSON

```bash
content-cli config nodes update --packageKey <packageKey> --nodeKey <nodeKey> -f <path-to-node.json> --json
```

## Archiving a Node

The **config nodes archive** command archives a node in the **staging (draft) version** of a package. Archiving is a soft-delete: the node is hidden from the active package state but its history is preserved, so previously published versions of the package that include the node are unaffected.

This command requires **edit permission** on the target package (see [Permissions](#permissions)).

### Archive a Node

```bash
content-cli config nodes archive --packageKey <packageKey> --nodeKey <nodeKey>
```

On success, the command prints:

```bash
info:    Node <nodeKey> in package <packageKey> archived successfully.
```

### Archive a Node That Has Dependants

By default, archiving a node fails if other nodes still depend on it. This protects you from accidentally breaking references in the package.

If you intentionally want to archive a node despite its dependants — for example because you are about to archive the dependants too, or because the references are known to be safe — use the `--force` flag:

```bash
content-cli config nodes archive --packageKey <packageKey> --nodeKey <nodeKey> --force
```

Use `--force` with care: dependants are not archived for you, and the package may temporarily contain broken references until you fix them.

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
