---
name: SP-1089 command integration tests
overview: Refactor `src/content-cli.ts` to expose a `createProgram(context)` factory, then convert the two existing module specs into Commander-driven integration tests under `tests/integration/commands/`.
todos:
  - id: factory
    content: "Refactor src/content-cli.ts: extract createProgram(context, { modules? }) factory, move banner/parseOptions/run into a guarded bootstrap, switch to parseAsync"
    status: pending
  - id: helper
    content: Add tests/utls/cli-program.ts with buildTestProgram(modules) helper that wires testContext into createProgram
    status: pending
  - id: asset-registry-it
    content: Move and rewrite asset-registry-module.spec.ts as tests/integration/commands/asset-registry/asset-registry.command-integration.spec.ts using parseAsync
    status: pending
  - id: config-mgmt-it
    content: Move and rewrite configuration-management/module.spec.ts as tests/integration/commands/configuration-management/configuration-management.command-integration.spec.ts; convert .rejects.toThrow assertions to logger transport assertions
    status: pending
  - id: verify
    content: Run the full jest suite and a build smoke test (node dist/content-cli.js --help) to confirm no regressions
    status: pending
isProject: false
---

## Goal

SP-1089 — drive Content CLI command tests through the real Commander parser instead of poking private action methods. The two existing "module" specs only exercise the action callbacks; they bypass Commander's command registration, option parsing, defaults, type coercion, and validation. After this change, tests will mirror what an end user types and run through the same parse path the binary uses.

## Files in scope

- [src/content-cli.ts](src/content-cli.ts) — refactor to expose a factory.
- [src/core/command/module-handler.ts](src/core/command/module-handler.ts) — read-only reference; do not change behaviour. The `Configurator.action` wrapper logs and swallows errors, which informs how tests must assert validation failures (see "Error assertions" below).
- [tests/commands/configuration-management/module.spec.ts](tests/commands/configuration-management/module.spec.ts) — rewrite & relocate.
- [tests/commands/asset-registry/asset-registry-module.spec.ts](tests/commands/asset-registry/asset-registry-module.spec.ts) — rewrite & relocate.
- [tests/utls/test-context.ts](tests/utls/test-context.ts) — reuse, add a small CLI helper next to it.

The service-level specs (e.g. [tests/commands/asset-registry/asset-registry-list.spec.ts](tests/commands/asset-registry/asset-registry-list.spec.ts), the bulk of the `configuration-management/*.spec.ts` tree) are untouched — they cover service logic against mocked HTTP, which is orthogonal to argument parsing.

## 1. Expose a `createProgram` factory

Today `src/content-cli.ts` constructs `program` at module top level, calls `parseOptions(process.argv)`, prints the version banner, builds a `Context`, and finally calls `program.parse(process.argv)` inside `run()`. Importing this file from a test would execute all of that.

Refactor by extracting two pure pieces and gating the bootstrap:

- `export async function createProgram(context: Context, opts?: { modules?: IModuleConstructor[] }): Promise<Command>` — builds a fresh `Command`, configures help / version / global options, wires a `ModuleHandler`, calls `configureRootCommands`, and either auto-discovers modules (production) or registers the explicit list passed in (tests). Returns the configured program without parsing argv.
- `async function run(): Promise<void>` — keeps the existing banner / debug-log / context-init / `parseAsync(process.argv)` flow, calling `createProgram(context)`.
- Replace top-level `run();` with `if (require.main === module) { run(); }` so importing the file from tests is a no-op. The version banner, debug-level switch, and `parseOptions(process.argv)` block move inside `run()` (they are CLI-bootstrap concerns, not factory concerns).

Switch the parse to `parseAsync(process.argv)` so async actions are awaited end-to-end (matches what tests will use). The `try/catch` around it stays.

Sketch of the factory shape:

```typescript
export async function createProgram(
    context: Context,
    opts: { modules?: IModuleConstructor[] } = {},
): Promise<Command> {
    const program = new Command();
    program.configureHelp({ /* unchanged */ });
    program.version(VersionUtils.getCurrentCliVersion());
    program.option("-q, --quietmode", "Reduce output to a minimum", false);
    program.option("-p, --profile [profile]");
    program.option("--gitProfile [gitProfile]", "Git profile to use");
    program.option("--debug", "Print debug messages", false);
    program.option("--dev", "Development Mode", false);

    const moduleHandler = new ModuleHandler(program, context);
    configureRootCommands(moduleHandler.configurator);

    if (opts.modules) {
        for (const ModuleClass of opts.modules) {
            new ModuleClass().register(context, moduleHandler.configurator);
        }
    } else {
        moduleHandler.discoverAndRegisterModules(__dirname, program.opts().dev);
    }

    return program;
}
```

Tests pass `{ modules: [Module] }` so they avoid filesystem-based discovery (which would conflict with the `jest.mock("fs")` setup in [tests/jest.setup.ts](tests/jest.setup.ts)).

## 2. Add a tiny CLI test helper

New file `tests/utls/cli-program.ts`:

- Re-exports a small `buildTestProgram(modules: IModuleConstructor[]): Promise<Command>` that calls `createProgram(testContext, { modules })`.
- Tests do not need profile/HTTP changes — they continue to import `testContext` from [tests/utls/test-context.ts](tests/utls/test-context.ts), and individual specs `jest.mock(...)` the underlying services so no real HTTP is hit.

## 3. Move and rewrite the two module specs

Move:

- `tests/commands/configuration-management/module.spec.ts` → `tests/integration/commands/configuration-management/configuration-management.command-integration.spec.ts`
- `tests/commands/asset-registry/asset-registry-module.spec.ts` → `tests/integration/commands/asset-registry/asset-registry.command-integration.spec.ts`

`testMatch` in [jest.config.ts](jest.config.ts) is `<rootDir>/tests/**/*.spec.ts`, so the new path is picked up automatically.

Inside each new spec:

- Drop `(module as any).method(testContext, mockCommand, options)` calls. Replace with `await program.parseAsync(["node", "content-cli", ...args])`.
- Build the program once per test (or per `beforeEach`) via `buildTestProgram([Module])` so each test has a clean Commander state.
- Keep `jest.mock(...)` of the downstream services and the existing `mockImplementation(() => mockService)` pattern. Assertions on `mockService.<method>` parameters stay almost identical, but values like `withDependencies` will now reflect Commander's parsing (e.g. an absent boolean flag becomes `undefined` rather than the explicit `false` the action body forces).
- Rename `describe` blocks to "<area> command integration" to match the file naming.

Example translation for `asset-registry list --json`:

```typescript
const program = await buildTestProgram([Module]);
await program.parseAsync(["node", "content-cli", "asset-registry", "list", "--json"]);
expect(mockService.listTypes).toHaveBeenCalledWith(true);
```

Equivalent rewrite for the existing private-method test in [tests/commands/asset-registry/asset-registry-module.spec.ts](tests/commands/asset-registry/asset-registry-module.spec.ts).

## 4. Error / validation assertions

The current specs assert `await expect((module as any).fn(...)).rejects.toThrow("…")`. That works only because the test bypasses `Configurator.action`, which catches every error and logs `An unexpected error occured executing a command: <err>`. Once tests go through `parseAsync`, the Configurator swallows the throw and `parseAsync` resolves cleanly. Two changes:

- Use the existing `loggingTestTransport` from [tests/jest.setup.ts](tests/jest.setup.ts) to assert the validation message reached the user:
  ```typescript
  expect(loggingTestTransport.logMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({
          level: "error",
          message: expect.stringContaining("Please provide either --packageKeys or --keysByVersion, but not both."),
      }),
  ]));
  ```
- Continue to assert `expect(mockService.fn).not.toHaveBeenCalled()` so the negative path is still tightened.

This is a more accurate test of what the user actually sees and keeps the production `Configurator` behaviour unchanged.

## 5. Verification

- `yarn jest` (or the project's existing script) — both rewritten specs and untouched service specs must stay green.
- Manual smoke: `yarn build && node dist/content-cli.js --help` to ensure the bootstrap refactor did not regress the binary entry.

## Out of scope

- Real HTTP / nock-based end-to-end tests — that is SP-1063 and explicitly a follow-up.
- Touching service-level specs that already exercise mocked axios.
- Behaviour changes to the `Configurator` error-handling wrapper.