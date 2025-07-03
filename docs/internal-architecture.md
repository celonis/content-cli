# **Content CLI – Architecture & Inner Workings**

## **Overview**

The Content CLI is a TypeScript based CLI that allows interaction with the Celonis Platform. Its core functionality includes extracting, pushing, and managing Celonis Platform content.

**Key Dependencies**

| **Dependency** | **Purpose** |
| --- | --- |
| commander | CLI parsing and command configuration and routing |
| axios | HTTP client for API calls |
| form-data | Multipart file uploads (e.g. zip files) |

## **Entry Point**

The CLI starts at the `content-cli.ts` file, which:

- Loads and registers all command modules.
- Parses user input from the command line.
- Initializes the shared context object.
- Passes execution to the appropriate command.

When built, it produces a `dist/content-cli.js`, which users execute with: `node content-cli.js [commands] [options]`

The **help** dialog is shown when:

- The user passes -h or --help
- The user runs an incomplete or invalid command

Help output includes descriptions, options and subcommands (if available) for the called command. It is auto-generated from the Commander configuration.

## **Context Passing**

The context object is passed to all commands and services. It includes:

- **Profile**: The profile which is used for each command execution as authentication.
- **Logger**: The global logger, with optional debug logging.
- **HttpClient**: Authenticated Celonis Platform API client.

This object is passed into command callbacks, ensuring that state and services are shared cleanly:
```
private async commandHandler(context: Context): Promise<void> {
    await context.httpClient.get('...');
}
```

## **Profile management**

Every command in the Content CLI runs within the context of a profile. A profile contains information about the target Celonis team, including the base URL and authentication credentials.

There are two ways a profile is used:

- You can pass it directly to any command using the `--profile` flag.
- Or you can set a default profile so it's used automatically without passing the flag every time.

To manage profiles, use the content-cli profile command group. This allows you to:

- Create a new profile
- List existing profiles
- Set a profile as the default
- Delete unused profiles

## **API communication**

The **HttpClient** class is a centralized client for interacting with the Celonis Platform API. It handles:

- **Auth**: Authenticates by sending the token in the provided profile.
- **URL building**: Prefixing all API paths with the correct base (e.g. realm), inferred from the profile
- **Request execution**
    - Uses axios under the hood, for HTTP API call executions.
    - Handles GET, POST, PUT, and DELETE methods.
    - Returns parsed responses to commands.
- **Error handling**: Mapping error codes to readable messages.

This prevents duplication of HTTP logic in individual modules.

## **Managing Command Modules**

### **Modules**

Each common functionality group is implemented as a separate module, which is represented by a directory in the src/command folder, and is enabled as a module by a module.ts class which implements the IModule.

The implementation consists of a register() method, which utilizes the passed Configurator object, which supports interactions with [Commander’s Command](https://www.npmjs.com/package/commander) API. The API gets used to:

- Register commands
- Define their description, options and action which will be taken when the command is executed.

### **Module Handler**

These modules get loaded by the **module handler**, which:

- Scans available modules (like configuration-management, studio).
- Calls each module’s registration function.
- Registers the command using Commander.js.

This means that the registration of a new module is automatically handled after module creation is done as described above.

## **Configurator Wrapper**

In order to provide more control over what is provided and what happens when interacting with Commander, there is a Configurator abstraction that wraps the underlying CLI command configuration. Its purpose is to:

- Enforce validation rules.
- Unify help text and usage patterns. (e.g. providing deprecation notice helper)

## **Error Handling**

### **General Error Handling**

- CLI argument parsing logic is wrapped in a try/catch.
- On failure, a clean message is shown and the process exits with a non-zero code.
- Unhandled errors are [caught globally](https://github.com/celonis/content-cli/blob/b76187e76e1f50d41a149bfe90d6ddead568c853/src/content-cli.ts#L74) to avoid raw stack traces.

### **HTTP Error Handling**

- All API calls go through a centralized HttpClient.
- HTTP call failures are caught and wrapped inside the HttpClient.
- Custom error messages (e.g. "Unauthorized" or "Server failed") are shown to the user.

## **Legacy BaseManager – Deprecated**

The project historically used a BaseManager pattern where each content type extended a shared manager class.

### **Why it's discouraged now:**

- Cluttered many functionalities in one place.
- Wasn’t reusable for new API endpoints
    - E.g.. config export/import commands.
- Harder developer experience and readability.

### **New approach:**

Custom API service classes are built around the HttpClient and context, which get used . These are:

- More testable
- Easier to extend
- More readable and explicit

We avoid using BaseManager in new modules and aim to migrate old ones when possible.