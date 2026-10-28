# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

This repository is **Content CLI** (`@celonis/content-cli`) — a Node.js command-line tool for managing content in Celonis Platform. There are no local backend services or Docker Compose stack; development is **install → build → test → run CLI**.

### Prerequisites

- **Node.js** `>=18.20.5` (CI uses Node 20; the VM ships with Node 22, which works)
- **yarn** (classic v1; lockfile is `yarn.lock`)

### Common commands

See `package.json` scripts and `README.md` for the canonical workflow:

| Task | Command |
|------|---------|
| Install dependencies | `yarn install` |
| Build (TypeScript → `dist/`) | `yarn build` |
| Run unit tests | `yarn test` |
| Lint | `yarn lint` |
| Run built CLI | `node dist/content-cli.js -h` |

After building, run the CLI from `dist/`:

```bash
node dist/content-cli.js -V
node dist/content-cli.js profile list
```

To use the local build as a global `content-cli` command: `cd dist && npm link`.

### Lint caveat

`yarn lint` (TSLint) currently reports pre-existing style violations across the codebase. CI (`/.github/workflows/build.yml`) runs **install, build, and test only** — not lint. Do not treat lint failures as a blocker for verifying the dev environment unless you are specifically fixing lint issues.

### Celonis Platform credentials (E2E only)

Most CLI commands (`pull`, `push`, `config export`, `asset-registry list`, etc.) require a live Celonis Platform tenant and a configured profile:

```bash
node dist/content-cli.js profile create
```

Or set `CELONIS_URL` and `CELONIS_API_TOKEN` environment variables. Commands like `profile list`, `-h`, and `-V` work locally without credentials.

### Testing split

- **Unit tests** (`yarn test`): Jest with mocked HTTP/filesystem — no external services needed.
- **End-to-end**: requires Celonis Platform access; no automated E2E suite in the repo.

### Optional integrations

- **Git profiles**: Git + GitHub for versioned export/import workflows (`content-cli git profile`).
- **OS keychain**: `@github/keytar` for secure credential storage; falls back to plaintext profiles on Linux without a keyring.
