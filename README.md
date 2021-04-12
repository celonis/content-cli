# Content CLI

Content CLI is a tool to help manage content in Celonis EMS. It provides various commands to help extract content like analyses, packages, assets and others from your Celonis EMS team to your local machine, which you can then push to other teams. This process can be easily achieved by creating profiles for your different teams and execute commands in a profile's context.

## Table of Contents

1. [About the Project](#about-the-project)
2. [Getting Started](#getting-started)
3. [Release Process](#release-process)
4. [Contributing](#contributing)
5. [License](#license)

## About the Project

Content CLI has three core functionalities:

**Profile:** The CLI connects to the EMS environments through profiles. For each of the commands you can specify which profile you want to use. This makes it powerful in the sense that you can pull something from let's say team1.cluser1 and push it directly to team2.cluster2 easily. You can create a profile using the following command:

``` content-cli profile create ```

**Pull:** This feature allows you to download content from the EMS to your local machine. Let's take Studio package as an example. These can be exported in the EMS as ZIP files that contain all package assets. By using the following command using the package key and profile you have created, you will pull the ZIP file.

``` content-cli pull package -p team1.cluster1 --key my-package ```

**Push:** This feature allows you to push a content file to a team in the EMS. To continue the last example, you can use the following command to push he previously pulled package in another team.

``` content-cli push package -p team2.cluster2 --file package_my-package.zip ```

A more comprehensive list of Content CLI capabilities can be found on the following [documentation](DOCUMENTATION.md). 

You can still explore the full capabilities of Content CLI and the list of options for the different commands by using the `-h` option in your command.

``` content-cli -h ``` 
``` content-cli pull package -h ```

## Getting Started

This tool is tightly connected with the Celonis EMS and all capabilities require to have access to a Celonis EMS Team. After cloning the project, the next step is to install the project dependencies. We use `yarn` as our package manager, so running `yarn install` on the project root folder should install all the necessary dependencies. After installing the project dependencies, you can run `yarn build` to build the project artifact. To use the built artifact, you can run `node content-cli.js` in the generated `dist` folder.

## Release Process

We manage releases using Github Actions with the `Build and Publish Workflow`. This action runs after merging to the master branch, which builds the project and publishes the package to the Github registry. You can install a published version of the Content CLI using the following command:

``` npm i -g @celonis/content-cli ```

## Contributing

We encourage public contributions! Please review [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development process.

## License

Copyright (c) 2021 Celonis SE

This project is licensed under the MIT License - see [LICENSE.md](LICENSE.md) file for details.
