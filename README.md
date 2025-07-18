# Content CLI

Content CLI is a tool to help manage content in Celonis Platform. It provides various commands to help extract 
content like analyses, packages, assets and others from your Celonis Platform team to your local machine, which 
you can then push to other teams. This process can be easily achieved by creating profiles for your different 
teams and execute commands in a profile's context.

## Table of Contents

1. [Getting Started](#getting-started)
2. [About the Project](#about-the-project)
3. [Building the Project](#building-the-project)
4. [Release Process](#release-process)
5. [Contributing](#contributing)
6. [License](#license)

## Getting Started

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

## About the Project

Content CLI has three core functionalities:

**Profile:** The CLI connects to the Celonis Platform environments through profiles. For each of the commands you can specify 
which profile you want to use. This makes it powerful in the sense that you can pull something from let's say 
team1.cluser1 and push it directly to team2.cluster2 easily. You can create a profile using the following command:

```
content-cli profile create
```

**Pull:** This feature allows you to download content from the Celonis Platform to your local machine. Let's take Studio package 
as an example. These can be exported in the Celonis Platform as ZIP files that contain all package assets. By using the following 
command using the package key and profile you have created, you will pull the ZIP file.

```
content-cli pull package -p <profile-name> --key <package-key>
```
Example, if you want to pull a package with key "interesting-package" from your profile "my-dev-profile", the command will look like this:
```
content-cli pull package -p my-dev-profile --key interesting-package
```

**Push:** This feature allows you to push a content file to a team in the Celonis Platform. To continue the last example, 
you can use the following command to push he previously pulled package in another team.

```
content-cli push package -p <profile-name> --spaceKey <space-key> -f <file-to-push.zip>

```
Example, if you want to push a package from zipped file "interesting-package.zip" to you team of profile "my-dev-profile" with the space "my-cool-space", the command will look like this:
```
content-cli push package -p my-dev-profile --spaceKey my-cool-space -f interesting-package.zip
```

A more comprehensive list of Content CLI capabilities can be found on the following 
[documentation](https://github.com/celonis/content-cli/blob/master/DOCUMENTATION.md). 

You can still explore the full capabilities of Content CLI and the list of options for the different commands 
by using the `-h` option in your command.

```
content-cli -h
content-cli pull package -h
```

## Building and Using the Project locally 

This tool is tightly connected with the Celonis Platform and all capabilities require to have access to a Celonis Platform Team. 
After cloning the project, the next step is to install the project dependencies. We use `yarn` as our package manager, 
so running `yarn install` on the project root folder should install all the necessary dependencies. After installing 
the project dependencies, you can run `yarn build` to build the project artifact. To use the built artifact, you can 
run `node content-cli.js` in the generated `dist` folder.

If we want to use a specific local build of the tool globally, we can do this by:
- Move to the root directory of the project.
- Execute `cd dist`, to move to the `dist` directory.
- Execute the `npm link` command. 
This will create a symbolic link in the global `node_modules` directory, allowing you to run the CLI from anywhere on your machine.

## Release Process

We manage releases using Github Actions with the `Build and Publish Workflow`. This action gets executed manually by the Codeowners when there are changes that need to be published.
This builds the project and publishes the package to the Github registry. You can install 
the latest published version of the Content CLI using the following command:

```
npm i -g @celonis/content-cli
```

## Contributing

We encourage public contributions! Please check 
[CONTRIBUTING.md](https://github.com/celonis/content-cli/blob/master/CONTRIBUTING.md) for details on our 
code of conduct.

For details on command development, refer to the [How to Add a Command](https://github.com/celonis/content-cli/blob/master/docs/how-to-add-command.md) guide.

## License

Copyright (c) 2021 Celonis SE

This project is licensed under the MIT License - 
see [LICENSE](https://github.com/celonis/content-cli/blob/master/LICENSE) file for details.
