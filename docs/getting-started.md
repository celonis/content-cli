# Getting Started

## Installation

To get started with using Content CLI, you will need to have `node` installed in your local machine. Please download
the LTS version that is recommended for most users from the `node` web page [here](https://nodejs.org/en/). After
installing `node` you can run the following command in the terminal (cmd for Windows users) to install Content CLI.
Note that the same command is used for updating Content CLI too.

```
npm install -g @celonis/content-cli
```

You can verify that the installation was successful by running the following command in the terminal, which prints
the installed version of Content CLI:

```
content-cli -V
```

To get started with using Content CLI, you can follow some examples to manage content that are available
as part of our pycelonis examples library [here](https://github.com/celonis/pycelonis-examples/tree/main/00_manage_celonis/00_ibc_to_ibc_movers).

## Using Profiles

Content CLI allows creating profiles for different environments. A profile consists of a name, URL to your Celonis Platform
team and an API token. Each of the commands include a ***--profile*** flag which allows you selecting a profile by its name.

Creating a profile is done by using the ***content-cli profile create*** command. The CLI will ask for a name, a URL and an API token. If the
provided information is correct, it will create a profile with the provided data. After successfully creating a profile, you can view
your profiles by running the ***content-cli profile list*** command.

| Note: Please do not use blanks in profile names |
|-------------------------------------------------|

### Profile Types

You can create profiles of two types: using OAuth (Device Code or Client Credentials) or using API Tokens (Application Key / API Key):

#### OAuth

OAuth supports with two grant types: Device Code & Client Credentials.

With Device Code, creating the profile will trigger an authorization flow
(using the OAuth 2.0 Device code). You will be prompted to follow an authorization
link where you must authorize the **Content CLI** to be able to access the Celonis Platform environment
on your behalf.

With Client Credentials, you need to provide the credentials (Client ID, Client Secret) configured for your OAuth client.
You can create and configure an OAuth clients in the `Admin & Settings` section of your Celonis account, under `Applications`.
The client needs to have any combination of these four scopes configured: "studio", "integration.data-pools", "action-engine.projects" and "package-manager".
After creating an OAuth client, you should assign it the permissions necessary for the respective commands. More
information on registering OAuth clients can be found [here](https://docs.celonis.com/en/registering-oauth-client.html).

#### API Token

You can choose between two different options when asked for an API token.
The first option is to use an API key, which identifies the user that created
the key. You can generate an API key in the `Edit Profile` section of your Celonis
user account, under `API-Keys`. The second options is to use an Application Key,
which is treated as a new user with separate configurable permissions. You can
generate an Application key in the `Team Settings` section of your Celonis account,
under `Applications`. After creating an Application, you can assign it different
permissions based on how much power you want to give to the key owner.

### Security Considerations

| ⚠️ **IMPORTANT SECURITY WARNING** |
|---|
| The CLI attempts to store profile credentials (API tokens, OAuth client secrets, and access tokens) securely using your system's native keychain/credential store. However, if keychain storage fails, credentials **will fall back to plaintext storage** on your local filesystem. |

**Secure Storage (Preferred):**

- When creating profiles, the CLI automatically attempts to store secrets in your system's secure credential store:
    - **macOS**: Keychain Access
    - **Windows**: Windows Credential Manager
    - **Linux**: libsecret (requires a secret service like GNOME Keyring or KWallet)
- If successful, secrets are **removed from the profile file** and stored securely in the system keychain

**Fallback to Plaintext Storage:**

- If keychain storage fails (e.g., keychain unavailable, permission denied, or unsupported system), secrets **will be stored in plaintext** in the profile file
- A warning message will be displayed: `⚠️ Failed to store secrets securely. They will be stored in plain text file.`
- For profiles with plaintext secrets, you may see a warning when accessing them: `⚠️ Profile secrets are stored as plain-text insecurely. Consider re-creating the profile to save the secrets securely.`

**Storage Location:**

- **Profile files** (may contain non-sensitive data if secrets are stored securely):
    - **Linux/macOS**: `~/.celonis-content-cli-profiles`
    - **Windows**: `%USERPROFILE%\.celonis-content-cli-profiles`
- **Secure secrets** (when successfully stored):
    - Stored in your system's native credential manager/keychain
    - Service name: `celonis-content-cli:<profile-name>`

**Protection Mechanisms:**

- **For securely stored profiles**: Secrets are protected by your system's keychain security (typically requires user authentication or system-level access)
- **For plaintext profiles**: Security relies **entirely on native operating system filesystem permissions**

**Best Practices:**

- Ensure your system keychain is properly configured and accessible
- If you see warnings about plaintext storage, use `content-cli profile secure <profile>` to migrate secrets to the system keychain
- Ensure that:
    - Your user account and filesystem are properly secured
    - File permissions restrict access to your user account only
    - You use appropriate security measures on shared or multi-user systems
    - Your system keychain is locked when not in use

### Migrating Existing Profiles to Secure Storage

If you have existing profiles with secrets stored in plaintext, you can migrate them
to secure system keychain storage without re-creating the profile:

```
content-cli profile secure <profileName>
```

This command will:

1. Read the existing profile and its plaintext secrets
2. Store the secrets in your system's native keychain/credential store
3. Remove the secrets from the plaintext profile file

If the profile is already using secure storage, the command will inform you that no
migration is needed. If keychain storage is unavailable, the command will warn you
that secrets remain in plaintext.

You can verify the migration was successful by checking that no warning is shown
when using the profile in subsequent commands.

### When to Create Profiles

So let's say you have a Studio package in [https://my-team.eu-1.celonis.cloud]()
and you want to push the same one to [http://my-other-team.eu-1.celonis.cloud]().
You can create two profiles: one for my-team and one for my-other-team.
Then, when you pull the package, you use the my-team profile and you
push the downloaded file again, but now using the my-other-team profile.

You also have the possibility to set a profile as default, so that you
don't have to set the profile flag over and over again when you use
commands. You can do so by using ***content-cli profile default
\<YOUR\_PROFILE\_NAME\>***. With the list command, you can also see
which of your commands is set to default.

### Using the CLI Without a Profile

If you do not want to use profiles, you can still use the CLI by providing
the Team URL and API token directly in the command by using the ***CELONIS_URL***
and ***CELONIS_API_TOKEN*** environment variables. For example:

```
CELONIS_URL=<your-team-url> CELONIS_API_TOKEN=<your-api-token> content-cli <command>
```

## Pull Command

By using ***content-cli pull***, you can pull content from a Celonis Platform team.
The CLI pulls that content to the current directory from where you are
using the CLI.

If you type ***content-cli pull --help***, you can see all available
sub-commands for ***pull***, which are basically the entity types which
you are able to pull.

```
content-cli pull --help
```

If you want to pull an analysis, you use ***content-cli pull
analysis***. If you again use the ***--help*** flag here, you see all
the options needed for pulling an entity. For pulling an analysis, it
looks something like this:

```
content-cli pull analysis --help
```

Different entities require different options. For example: to push an
analysis, you also need to specify to which workspace you want to push
that analysis. Therefore, you should make use of the flag ***--workspaceId***
to specify to which workspace it should be pushed and so on.

## Push Command

In the opposite to the pull command, with ***content-cli push*** you can
push content to the Celonis Platform. Similarly to the pull command, with the
***--help*** functionality you can see all the possible entities which
you can push.

```
content-cli push --help
```

### Push .CTP Files to the Celonis Platform

_This functionality supports .CTP files generated on a cpm4 instance version 4.6+._

By using ***content-cli push ctp***, you can push **.CTP** files from your local machine to the Celonis Platform, like the following examples:

```
// Push the analysis extracted from the .CTP file
content-cli push ctp -p my-profile-name --file path-to-ctp-file --password ctp-file-password --pushAnalysis
```

```
// Push the data models extracted from the .CTP file
content-cli push ctp -p my-profile-name --file path-to-ctp-file --password ctp-file-password --pushDataModels
```

## Using Git Profiles

In addition to Celonis profiles, you can configure **Git profiles** to interact with GitHub repositories directly from Content CLI.
This enables workflows where you export packages to a Git branch, collaborate via Git pull requests, and then import reviewed content back into Celonis.

A Git profile stores connection details for a Github repository and can be reused across commands.

You can create and list Git profiles with the following commands:

```bash
# Create a new Git profile
content-cli git profile create

# List all Git profiles
content-cli git profile list

# Set default Git profile
content-cli git profile default <git-profile-name>
```

A Git profile contains:

- **name** – unique identifier for the profile
- **repository** – the GitHub repository in the format `owner/repo`
- **authenticationType** – either `SSH` or `HTTPS`
- **username** – optional username (used for commit authoring)

### Authentication

The authentication is delegated your local Git configuration, based on the selected method (SSH or HTTPS).
If you haven't configured Git on your machine yet, you can follow [this guide](https://docs.github.com/en/get-started/git-basics/set-up-git) (required).

Besides profile authentication, the git related commands can also be set up in pipelines via the following environment variables:

- GIT_REPOSITORY – the GitHub repository in the format `owner/repo`
- GIT_TOKEN – a GitHub personal access token with `repo` scope (for HTTPS authentication)
- GIT_USERNAME – username (used for commit authoring)

### When to Create a Git Profile

A Git profile should be created to represent a Github repository and Github user credentials you want to use for interacting with content.

### Usage

Check if the command you're using is integrated with Git by using `--help` and seeing if git options are available.
If git is compatible with the command:

- You can use the `--gitProfile` option to specify the profile you want to use. This is optional if you have set a default Git profile.
- Check different command options like `--gitBranch` which targets the command operations in the selected branch. Note: the different options depend on the command.
