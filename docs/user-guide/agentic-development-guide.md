# Agentic Context Model authoring

Use Content CLI together with the Studio MCP server when an agent needs to
discover Context Model schemas, author package nodes, and validate a staging
draft. This guide starts after a populated Data Pool and a Context Model package
already exist. Create and load those prerequisites in the Celonis UI.

For the complete UI journey, see the
[Context Model end-to-end guide](https://github.com/celonis/context-model-documentation/tree/main/3-context-model/context-model-e2e-guide).
For MCP client configuration and authentication, use the
[Studio MCP setup guide](https://github.com/celonis/studio-mcp/blob/main/docs/index.md).

## Prerequisites

Collect these values before setup:

- the full Celonis team URL;
- the existing Context Model package key;
- the ID of the populated Data Pool connected to that package; and
- an Application Key identity with only the package, Studio, and Data Pool
  permissions needed for the intended work.

The target team must have Studio MCP and Asset Registry enabled. Do not paste an
Application Key into an agent conversation, source file, shell history, or MCP
configuration file.

## Install Content CLI

Install or update the current release and check its version:

```bash
npm install -g @celonis/content-cli@latest
content-cli -V
```

Use Content CLI `1.13.1` or later. That is the minimum version with the
non-persisting per-node validation and staging-node operations used below.

## Create a secure profile

Create a profile in an interactive local terminal:

```bash
content-cli profile create
```

Use these answers:

1. Name: `cm-<tenant-slug>` (for example, `cm-acme-eu-1`).
2. Team: the full `https://...celonis.cloud/` URL.
3. Profile type: `Application Key / API Key (3)`.
4. Token: enter the Application Key only at the local prompt.

The CLI attempts to store the secret in the operating system keychain. Confirm
the profile is present without displaying credentials, then explicitly verify
secure storage:

```bash
content-cli profile list
content-cli profile secure cm-<tenant-slug>
```

If `profile secure` reports that secure storage is unavailable and the secret
remains in plaintext, stop. Repair the system keychain and remove or recreate the
insecure profile before continuing.

## Discover the live agent surface

Configure the Studio MCP server using its canonical setup guide, restart the MCP
client, and start a fresh agent session. Call `discover_capabilities` first when
the server exposes it. During the skill-discovery rollout, some teams expose
`list_skills` and `get_skill` instead; follow the server instructions returned to
the client rather than assuming a fixed tool list.

Confirm that the live catalog includes these platform skills before Context
Model authoring:

- `skill://platform/content-cli-setup/SKILL.md`
- `skill://platform/build-context-model/SKILL.md`
- `skill://platform/package-authoring/SKILL.md`
- `skill://platform/package-validate/SKILL.md`
- `skill://platform/package-deployment/SKILL.md`

`build-context-model` is the current end-to-end skill. It replaces the removed
legacy `orchestrating-context-model-build` name. Also retrieve the `asset/...`
skills for every asset type you intend to author.

The CLI provides the same skill catalog for inspection or environments without
MCP:

```bash
content-cli asset-registry skills list -p cm-<tenant-slug>
content-cli asset-registry skills get \
  --path platform/build-context-model \
  --output ./skills \
  -p cm-<tenant-slug>
```

## Verify read access

Run read-only discovery before attempting any authoring:

```bash
content-cli config package list -p cm-<tenant-slug> --flavors OCDM
content-cli asset-registry list -p cm-<tenant-slug>
content-cli asset-registry skills list -p cm-<tenant-slug>
content-cli asset-registry schema \
  --assetType SEMANTIC_OBJECT_TYPE \
  -p cm-<tenant-slug>
```

The package list must contain the intended package. Asset Registry must return
the asset type, its schema, and the applicable skills. A package can be absent
from a list when the Application Key lacks access, so an empty or filtered result
is not proof that the package does not exist.

## Run a non-persisting validation probe

Build a unique `SEMANTIC_OBJECT_TYPE` create payload from the schema returned by
Asset Registry. Use the current catalog's schema version and the target package
key; do not copy a stale example. Save the payload outside a package working
tree, then validate it without persisting:

```bash
content-cli config nodes create \
  --packageKey <package-key> \
  --file /tmp/cm-setup-probe-<unique-id>.json \
  --validate \
  -p cm-<tenant-slug>
```

`--validate` is a dry run. It must not create a staging node, a package version,
or a deployment. Confirm that the unique probe key is absent afterward:

```bash
content-cli config nodes get \
  --packageKey <package-key> \
  --nodeKey cm_setup_probe_<unique-id> \
  -p cm-<tenant-slug>
```

The second command should report that the node is not found. Do not rerun the
create command without `--validate` as part of setup verification.

## Choose the authoring workflow

Use the narrowest operation that matches the change:

| Change | Use | Avoid |
| --- | --- | --- |
| Validate a proposed node | `config nodes create|update --validate` | Persisting a probe |
| Add, edit, or archive a few nodes | `config nodes create|update|archive` | Full-package overwrite |
| Create a new package from files | `config package import` | Per-node calls before the package exists |
| Replace or restructure a whole package | Fresh export, edit, then `config package import --overwrite` | Importing a stale snapshot |

Per-node operations preserve unrelated nodes in the current staging draft. For a
persisting change, retrieve the current node immediately before editing and
version only the node keys changed in that authoring session.

A full import replaces the staging package represented by the files. Before any
full export/import loop:

```bash
content-cli config metadata export \
  --packageKeys <package-key> \
  --json \
  -p cm-<tenant-slug>
content-cli config package export \
  --packageKey <package-key> \
  -p cm-<tenant-slug>
```

If `hasUnpublishedChanges` is `true`, stop and coordinate whether those changes
should be versioned or discarded. Always edit a fresh staging export, and do not
keep the package open for UI editing while an agent prepares an overwrite.

## Validation layers

Validation is deliberately split:

1. `config nodes create|update --validate` validates one proposed payload and
   does not persist it.
2. `config package import` automatically runs schema validation. There is no
   `--validate` flag on this command.
3. `config package validate` validates the current staging draft. Name every
   additional layer required for the package:

```bash
content-cli config package validate \
  --packageKey <package-key> \
  --layers SCHEMA BUSINESS PACKAGE_SETTINGS PIG_SEMANTICS DATA_PIPELINES \
  -p cm-<tenant-slug>
```

Use only layers relevant to the package. BUSINESS and query-engine-backed checks
can be eventually consistent immediately after model changes; retry after the
live perspective settles, or refresh a cached perspective, before treating a
transient load error as a model defect.

## Troubleshooting

| Symptom | Meaning and next check |
| --- | --- |
| `401 Unauthorized` | The credential is absent, expired, or uses the wrong authorization scheme. Recheck the secure profile or MCP launch environment. |
| `403 Insufficient scope` | An OAuth access token lacks a scope advertised by Studio MCP. This is distinct from Application Key permissions. |
| `403` for a package or a package missing from a list | The identity likely lacks package/space access or Edit access to the connected Data Pool. |
| `Feature 'studio-mcp.server' is not enabled for this team` | Studio MCP is disabled for the tenant; an administrator must enable it. |
| Asset types or skills are missing | Asset Registry, the relevant feature, or the package flavor is not enabled for the tenant. Re-run live discovery after enablement. |

Setup verification ends after read-only discovery and the non-persisting probe.
Do not import, version, deploy, execute a pipeline, mutate PQL, or refresh a
production data model merely to prove that setup works.
