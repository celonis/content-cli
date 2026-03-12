# Content CLI

Content CLI is a tool to help manage content in the Celonis Platform. It provides various commands to help extract
content like analyses, packages, assets and others from your Celonis Platform team to your local machine, which
you can then push to other teams. This process can be easily achieved by creating profiles for your different
teams and execute commands in a profile's context.

## Core Functionality

Content CLI has three core functionalities:

**Profile:** The CLI connects to the Celonis Platform environments through profiles. For each of the commands you can specify
which profile you want to use. This makes it powerful in the sense that you can pull something from let's say
team1.cluster1 and push it directly to team2.cluster2 easily.

**Pull:** This feature allows you to download content from the Celonis Platform to your local machine. These
can be exported as ZIP files that contain all package assets.

**Push:** This feature allows you to push a content file to a team in the Celonis Platform.

## Quick Start

```bash
# Install Content CLI
npm install -g @celonis/content-cli

# Verify installation
content-cli -V

# Create a profile
content-cli profile create

# Pull a package
content-cli pull package -p my-profile --key my-package

# Push a package
content-cli push package -p my-profile --spaceKey my-space -f my-package.zip
```

You can explore the full capabilities of Content CLI and the list of options for the different commands
by using the `-h` option in your command.

```bash
content-cli -h
content-cli pull package -h
```

## Documentation

- **[Getting Started](getting-started.md)** -- Installation, profiles, authentication, and basic usage
- **User Guide**
    - [Studio Commands](user-guide/studio-commands.md) -- Pull/push packages, assets, bookmarks, and listing
    - [Config Commands](user-guide/config-commands.md) -- Batch export/import, variables, nodes, diffs, and dependencies
    - [Deployment Commands](user-guide/deployment-commands.md) -- Create, history, active deployments, deployables, and targets
    - [Data Pool Commands](user-guide/data-pool-commands.md) -- Export/import data pools and connection management
    - [Action Flow Commands](user-guide/action-flow-commands.md) -- Analyze and export action flows
- **Development**
    - [Architecture](internal-architecture.md) -- Internal architecture and inner workings
    - [How to Add a Command](how-to-add-command.md) -- Guide for contributing new commands
    - [Release Management](how-to-release.md) -- Release lifecycle and workflows
