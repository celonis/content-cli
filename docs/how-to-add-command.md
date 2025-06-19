# CLI – How to Add a New Command in Content CLI

## Overview

This guide explains how to add a new command in Content CLI. It covers both adding commands to existing groups and creating entirely new command groups. It also lays down expectations for documentation, folder structure, and ownership.

---

## Adding a New Command to an Existing Group

### 1. Locate the Command Group

Command groups are located under the `src/commands/` directory. Each group contains a `module.ts` file where its commands are registered.

---

### 2. Register the Command in `module.ts`

Use the `Configurator` API to define your command. There are three common command types:

#### **Command Type A: Top Command (Not callable on its own)**

Use this type when a command is intended only as a top-level command for a group of subcommands. When called on its own, this will:

- Not have any action taken.
- Show a description. This description should be configured in the command.
- Show a list of subcommands.

```ts
const listCommand = configurator.command("listCommand")
  .description("Commands that do listing");
```

---

#### **Command Type B: Top-Level Callable Command**

Use this type when a command is intended as a top-level command that can be executed directly.

```ts
configurator.command("export")
  .description("Export everything")
  .option("--keys <key>", "What to export")
  .action(exportHandlerMethod);
```

---

#### **Command Type C: Subcommand Definition**

To define a subcommand on top of an existing command, use the existing top command (e.g. `listCommand`), and configure the subcommand similarly.

```ts
const listPackagesCommand = listCommand.command("packages")
  .description("Lists packages")
  .action(handlePackageListing);
```

---

### 3. Document the Command

Add documentation for the command in the `DOCUMENTATION.md` file in the repo.

Each command must include:

- A clear **description**
- At least one **usage example**

---

## Adding a New Command Group

### When Should You Create a New Group?

Create a new command group if:

- The commands don't logically belong in any existing group.
- Another team will be the primary maintainer/owner.

---

### Steps to Create a New Group

1. **Create a new directory** under `src/commands/`  
   Example: `src/commands/example-area`

2. **Add an entry to `CODEOWNERS`**  
   Point the path to the owning team:
   ```
   src/commands/example-area/ @owning-team
   ```

3. **Create a `module.ts` file** in the new folder  
   This file must implement the `IModule` interface and configure the new command inside the `register()` method.

4. **Implement the command logic**  
   Add the necessary services/APIs/interfaces in the newly created directory.

---

## Recommended Folder Structure

To promote maintainability, follow this structure where appropriate:

```
src/commands/example/
├── module.ts                   # Command configuration and entry point
├── example.command.service     # Main command logic
├── api/                        # API definitions
├── interface/                  # Interfaces and transports
├── service/                    # Supporting services
```

You are free to adapt the structure based on complexity.

---

## Ownership and Documentation

- Command-level documentation (description, options, examples) is the responsibility of the **command-owning team**.
- Framework documentation, utilities, and shared patterns are maintained by the **CLI foundation team**.

---

## Useful Examples

Example group: `configuration-management`  
(*Link to be added after merging changes into the main branch*)
