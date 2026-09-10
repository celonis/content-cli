# Asset Registry Commands

The **asset-registry** command group allows you to discover registered asset types, fetch their schemas, and examples from the Asset Registry.
This is useful for understanding which asset types are available on the platform, their configuration structure, and example configurations to author assets against.

## List Asset Types

List all registered asset types and a summary of their metadata.

```
content-cli asset-registry list
```

Example output:

```
BOARD_V2 - View [DASHBOARDS]
SEMANTIC_MODEL - Knowledge Model [DATA_AND_PROCESS_MODELING] - Defines KPIs, records, filters, and data bindings for analytics
```

Each line is `<assetType> - <displayName> [<group>]` followed by ` - <description>` when the asset type provides one.

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

## Validating assets

Assets are validated through `config package validate`, which runs the asset service's validation
alongside the other validation layers and can be narrowed to individual nodes:

```
content-cli config package validate --packageKey my-pkg --nodeKeys my-view
```

See [Configuration Management Commands](config-commands.md) for the full option list.

## Get Examples

Fetch example configurations for an asset type. Not all asset types provide examples.

```
content-cli asset-registry examples --assetType BOARD_V2
```

Options:

- `--assetType <assetType>` (required) – The asset type identifier
- `--json` – Write the examples to a JSON file in the working directory

## Troubleshooting

If the asset registry is disabled on your team, commands fail with:

```
Asset registry is not enabled for this team. Contact your administrator to enable the feature.
```

This replaces the raw API error and indicates the feature is turned off server-side, not a permissions or connectivity issue on your CLI profile.
