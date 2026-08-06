# Data Model Migration Commands

These commands export a Data Integration data model from cloud-data-integration and convert it into semantic entity nodes in a target OCDM package via the Pacman staging-node API (same path as `config nodes create`).

Supported mappings:

| Data Integration | Semantic entity |
|---|---|
| Table | Object (with data binding) |
| Process configuration (event log) | Event source (with data binding) |
| Classic foreign key | Relationship |
| Data model | Perspective |

**Object links** (`signal-links` in cloud-data-integration) are **not** supported. The converter only reads classic `foreignKeys[]` from the `/transport` export.

## Export Data Model

Downloads the full data model transport (tables, columns, foreign keys, process configurations):

```
content-cli export data-model --poolId <pool-id> --dataModelId <data-model-id> --profile <profile> [--outputToJsonFile]
```

Example:

```
content-cli export data-model --poolId 80a1389d-50c5-4976-ad6e-fb5b7a2b5517 --dataModelId 1b9b368b-e0df-4e74-99e8-59e2febe9687 --profile local --outputToJsonFile
```

## Push Semantic Model

Converts the data model and pushes semantic entity nodes into a target OCDM package:

```
content-cli push semantic-model \
  --poolId <pool-id> \
  --dataModelId <data-model-id> \
  --package <package-key> \
  --profile <profile> \
  [--schema <lake-schema>] \
  [--namespace <namespace>] \
  [--fromFile <transport.json>] \
  [--dryRun] \
  [--outputToJsonFile]
```

Options:

- `--schema`: Physical lake schema used in data bindings. When omitted, the CLI derives `datapipelines_<poolId>_draft` (hyphens in the pool id become underscores).
- `--fromFile`: Skip download and convert a previously exported transport JSON file.
- `--dryRun`: Convert only; print or write the Pacman node payloads without calling the staging-node API.
- `--namespace`: Optional namespace for data bindings (entity references use the package `local` namespace by default).

Push order: objects → event sources → relationships → perspective.

Each entity is created as a Pacman staging node with types `SEMANTIC_OBJECT_TYPE`, `SEMANTIC_EVENT_SOURCE_TYPE`, `SEMANTIC_RELATIONSHIP_TYPE`, and `SEMANTIC_PERSPECTIVE_TYPE`.

After pushing, validate and version the authored nodes with the standard config commands:

```
content-cli config package validate --packageKey <package-key> --nodeKeys <key1> <key2> --layers SCHEMA BUSINESS
content-cli config versions create --packageKey <package-key> --nodeFilterKeys <key1> <key2> --versionBumpOption PATCH --summaryOfChanges "..."
```

Example dry run:

```
content-cli push semantic-model \
  --poolId 80a1389d-50c5-4976-ad6e-fb5b7a2b5517 \
  --dataModelId 1b9b368b-e0df-4e74-99e8-59e2febe9687 \
  --package my-context-model \
  --profile local \
  --dryRun
```

## Authentication

- **Download** uses the existing `integration.data-pools` OAuth scope (same as other data pool commands).
- **Push** uses the existing `package-manager` OAuth scope via `/pacman/api/core/staging/packages/{packageKey}/nodes`. Ensure the profile has edit access to the target package.
