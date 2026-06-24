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

## Skills

The asset registry also publishes agent skills (authored guidance for the platform and for specific asset types). Each skill exposes a `SKILL.md` and optional reference files.

### List Skills

List all skills available on the platform.

```
content-cli asset-registry skills list
```

Example output:

```
content-cli-setup (platform/content-cli-setup) - Install content-cli and create a profile against a Celonis team.
asset-studio-board-v2 (asset/BOARD_V2/asset-studio-board-v2) - Authoring one Celonis Studio view asset of type BOARD_V2.
```

Each line is `<name> (<path>)` followed by ` - <description>` when the skill provides one. The `<path>` value is what you pass to `skills get --path`.

Use `--json` to write the full response to a JSON file in the working directory:

```
content-cli asset-registry skills list --json
```

### Download a Skill File

Download a skill's `SKILL.md` (or a specific reference file) to the local filesystem. The Studio MCP server remains the recommended source for live agent use; this command is a fetch/inspect utility for environments without the MCP server, for offline review, or for vendoring a copy into a repo.

Download the default `SKILL.md` for a platform skill:

```
content-cli asset-registry skills get --path platform/content-cli-setup
```

Download a `SKILL.md` for an asset skill:

```
content-cli asset-registry skills get --path asset/BOARD_V2/asset-studio-board-v2
```

Download a specific reference file and write into a target directory:

```
content-cli asset-registry skills get \
  --path asset/BOARD_V2/asset-studio-board-v2 \
  --file refs/example.md \
  --output ./skills
```

Options:

- `--path <path>` (required) – Skill path from `asset-registry skills list` (e.g. `platform/<skill>` or `asset/<assetType>/<skill>`).
- `--file <file>` – Relative path of a reference file within the skill. Defaults to `SKILL.md` when omitted.
- `--output <output>` – Destination directory. Defaults to the current working directory. Created automatically if it does not exist.

Behavior:

- The local filename is the basename of `--file` (or `SKILL.md` when `--file` is omitted). Subdirectories in `--file` are not preserved on the local side.
- Re-running the command overwrites the existing local file without prompting.
- On success the command logs a single confirmation line with the absolute path of the written file.
- A missing skill or file returns a clear error such as `Problem getting SKILL.md for 'platform/missing': ...`.

## Troubleshooting

If the asset registry is disabled on your team, commands fail with:

```
Asset registry is not enabled for this team. Contact your administrator to enable the feature.
```

This replaces the raw API error and indicates the feature is turned off server-side, not a permissions or connectivity issue on your CLI profile.
