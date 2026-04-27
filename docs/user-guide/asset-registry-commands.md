# Asset Registry Commands

The **asset-registry** command group allows you to discover registered asset types, fetch their schemas, examples, and methodology from the Asset Registry.
This is useful for understanding which asset types are available on the platform, their configuration structure, and best practices for authoring assets.

## List Asset Types

List all registered asset types and a summary of their metadata.

```
content-cli asset-registry list
```

Example output:

```
BOARD_V2 - View [DASHBOARDS] (basePath: /blueprint/api)
SEMANTIC_MODEL - Knowledge Model [DATA_AND_PROCESS_MODELING] (basePath: /semantic-layer/api)
```

It is also possible to use the `--json` option for writing the full response to a file that gets created in the working directory.

```
content-cli asset-registry list --json
```

## Get Asset Type

Get the full descriptor for a specific asset type, including schema version, service base path, and endpoint paths.

```
content-cli asset-registry get --assetType BOARD_V2
```

Example output:

```
Asset Type:   BOARD_V2
Display Name: View
Group:        DASHBOARDS
Schema:       v2
Base Path:    /blueprint/api
Endpoints:
  schema:     /validation/schema/board_v2
  validate:   /validate
  methodology: /methodology/board_v2
  examples:   /examples/board_v2
```

Options:

- `--assetType <assetType>` (required) – The asset type identifier (e.g., `BOARD_V2`, `SEMANTIC_MODEL`)
- `--json` – Write the full response to a JSON file in the working directory

## Get Schema

Fetch the JSON Schema that defines the valid structure of an asset type's `configuration` object.

```
content-cli asset-registry schema --assetType BOARD_V2
```

The response is the full JSON Schema (draft-07) for the asset type. Use `--json` to save it to a file for reference during asset authoring.

```
content-cli asset-registry schema --assetType BOARD_V2 --json
```

Options:

- `--assetType <assetType>` (required) – The asset type identifier
- `--json` – Write the schema to a JSON file in the working directory

## Validate

Validate asset configurations against the asset service's validation endpoint. There are two top-level modes:

1. **Build-from-options mode** – `--packageKey` plus exactly one of:
   - **`--nodeKey`** to validate an already-stored node on the platform, or
   - **`--configuration`** to validate a raw configuration JSON before import.

   `--nodeKey` and `--configuration` are mutually exclusive. The CLI wraps the inputs into a `ValidateRequest` envelope for you.

2. **File mode (`-f` / `--file`)** – Provide a JSON file containing the full `ValidateRequest` body. Use this for multi-node validation or any case the build-from-options mode doesn't cover. Mutually exclusive with `--packageKey`, `--nodeKey` and `--configuration`.

### Validate an already-stored node (`--nodeKey`)

```
content-cli asset-registry validate --assetType BOARD_V2 \
  --packageKey my-pkg --nodeKey my-view
```

Sends:

```json
{
  "assetType": "BOARD_V2",
  "packageKey": "my-pkg",
  "nodeKeys": ["my-view"]
}
```

### Validate a raw configuration (`--configuration`)

```
content-cli asset-registry validate --assetType BOARD_V2 \
  --packageKey my-pkg \
  --configuration '{"components":[{"type":"kpi"}]}'
```

Sends:

```json
{
  "assetType": "BOARD_V2",
  "packageKey": "my-pkg",
  "nodes": [{ "key": "validation-node", "configuration": { "components": [{ "type": "kpi" }] } }]
}
```

### Full request from file (`-f`)

```
content-cli asset-registry validate --assetType BOARD_V2 -f request.json
```

Use this when you need control over the full body (e.g., multiple inline nodes with specific keys).

### Options

- `--assetType <assetType>` (required) – The asset type identifier
- `--packageKey <packageKey>` – Package key. Required when validating with `--nodeKey` or `--configuration`.
- `--nodeKey <nodeKey>` – Key of an already-stored node to validate (use with `--packageKey`).
- `--configuration <configuration>` – Inline JSON of a configuration to validate (use with `--packageKey`).
- `-f, --file <file>` – Path to a JSON file containing a full `ValidateRequest` body. Mutually exclusive with the build-from-options flags.
- `--json` – Write the validation response to a JSON file in the working directory

## Get Examples

Fetch example configurations for an asset type. Not all asset types provide examples.

```
content-cli asset-registry examples --assetType BOARD_V2
```

Options:

- `--assetType <assetType>` (required) – The asset type identifier
- `--json` – Write the examples to a JSON file in the working directory

## Get Methodology

Fetch methodology and best-practices guidance for an asset type. Not all asset types provide methodology.

```
content-cli asset-registry methodology --assetType BOARD_V2
```

Options:

- `--assetType <assetType>` (required) – The asset type identifier
- `--json` – Write the methodology to a JSON file in the working directory
