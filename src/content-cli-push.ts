import * as fs from "fs";
import * as path from "path";

import { SkillCommand } from "./commands/skill.command";
import { WidgetCommand } from "./commands/widget.command";
import { DataPoolCommand } from "./commands/data-pool.command";
import { AssetCommand } from "./commands/asset.command";
import { PackageCommand } from "./commands/package.command";
import { CTPCommand } from "./commands/ctp.command";
import { AnalysisBookmarksCommand } from "./commands/analysis-bookmarks.command";
import { execSync } from "child_process";
import { GracefulError, logger } from "./util/logger";
import { Command } from "commander";
import { program } from "./util/program";

class Push {

    public static analysisBookmarks(program: Command): Command {
        program
            .command("bookmarks")
            .description("Command to push an analysis to a workspace")
            .option("-p, --profile <profile>", "Profile which you want to use to push the analysis")
            .requiredOption("--id <id>", "Id of the Analysis to which you want to push the analysis bookmarks")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .action(async cmd => {
                await new AnalysisBookmarksCommand().pushAnalysisBookmarks(cmd.profile, cmd.id, cmd.file);
                process.exit();
            });

        return program;
    }

    public static ctp(program: Command): Command {
        program
            .command("ctp")
            .description("Command to push a .ctp (Celonis 4 transport file) to create a package")
            .option("-p, --profile <profile>", "Profile which you want to use to push the analysis")
            .option("-a, --pushAnalysis", "Specify this option if you want to push analysis from the CTP file")
            .option("-d, --pushDataModels", "Specify this option if you want to push data models from the CTP file")
            .option(
                "--globalPoolName <globalPoolName>",
                "Specify this option if you want to push all Data models into one newly created pool along with value to set the name of the pool to be created",
                null
            )
            .option(
                "--existingPoolId <existingPoolId>",
                "Specify this option if you want to push all Data models into one already existing pool with provided ID",
                null
            )
            .option(
                "-s, --spaceKey <spaceKey>",
                "The key of the destination space where the analyses from .ctp file will be created.",
                ""
            )
            .requiredOption("-f, --file <file>", "The .ctp file you want to push")
            .requiredOption("--password <password>", "The password used for extracting the .ctp file")
            .action(async cmd => {
                await new CTPCommand().pushCTPFile(
                    cmd.profile,
                    cmd.file,
                    cmd.password,
                    cmd.pushAnalysis,
                    cmd.pushDataModels,
                    cmd.existingPoolId,
                    cmd.globalPoolName,
                    cmd.spaceKey
                );
                process.exit();
            });

        return program;
    }

    public static skill(program: Command): Command {
        program
            .command("skill")
            .description("Command to push a skill to a project")
            .option("-p, --profile <profile>", "Profile which you want to use to push the skill")
            .requiredOption("--projectId <projectId>", "Id of the project you want to push")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .action(async cmd => {
                await new SkillCommand().pushSkill(cmd.profile, cmd.projectId, cmd.file);
                process.exit();
            });

        return program;
    }

    public static widget(program: Command): Command {
        program
            .command("widget")
            .description("Command to push a widget")
            .option("-p, --profile <profile>", "Profile which you want to use to push the widget")
            .option("--tenantIndependent", "Upload widget tenant independently")
            .option("--userSpecific", "Upload widget only for the user in the provided api token")
            .option("--packageManager", "Upload widget to package manager (deprecated)") // Deprecated
            .action(async cmd => {
                await new WidgetCommand().pushWidget(cmd.profile, !!cmd.tenantIndependent, !!cmd.userSpecific);

                if (process.env.AWS_ACCESS_KEY_ID_CDN && process.env.AWS_SECRET_ACCESS_KEY_CDN) {
                    try {
                        const dir = path.resolve(process.cwd());
                        const pushToS3stdout = execSync(
                            `aws s3 cp ${dir} s3://celonis-static-origin/static/package-manager/ --recursive --exclude="*.map" --exclude="*.yaml" --profile default`
                        ).toString("utf-8");
                        logger.info(pushToS3stdout);
                    } catch (error) {
                        logger.error(new GracefulError(error.stderr?.toString() || error.message));
                    }
                }

                const zipFileName = path.resolve(process.cwd(), "output.zip");
                fs.unlinkSync(zipFileName);
                process.exit();
            });

        return program;
    }

    public static dataPool(program: Command): Command {
        program
            .command("data-pool")
            .description("Command to push a data pool")
            .option("-p, --profile <profile>", "Profile which you want to use to push the data pool")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .action(async cmd => {
                await new DataPoolCommand().pushDataPool(cmd.profile, cmd.file);
                process.exit();
            });
        return program;
    }

    public static dataPools(program: Command): Command {
        program
            .command("data-pools")
            .description("Command to push data pools")
            .option("-p, --profile <profile>", "Profile which you want to use to push the data pools")
            .action(async cmd => {
                await new DataPoolCommand().pushDataPools(cmd.profile);
                process.exit();
            });

        return program;
    }

    public static asset(program: Command): Command {
        program
            .command("asset")
            .description("Command to push an asset to Studio")
            .option("-p, --profile <profile>", "Profile which you want to use to push the asset")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .requiredOption("--package <packageKey>", "Key of the package you want to push asset to")
            .action(async cmd => {
                await new AssetCommand().pushAsset(cmd.profile, cmd.file, cmd.package);
                process.exit();
            });

        return program;
    }

    public static assets(program: Command): Command {
        program
            .command("assets")
            .description("Command to push assets to Studio")
            .option("-p, --profile <profile>", "Profile which you want to use to push the assets")
            .requiredOption("--package <packageKey>", "Key of the package you want to push assets to")
            .action(async cmd => {
                await new AssetCommand().pushAssets(cmd.profile, cmd.package);
                process.exit();
            });

        return program;
    }

    public static package(program: Command): Command {
        program
            .command("package")
            .description("Command to push a package to Studio")
            .option("-p, --profile <profile>", "Profile which you want to use to push the package")
            .option("--newKey <newKey>", "Define a new key for your package")
            .option("--overwrite", "Overwrite package and its assets")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .requiredOption("--spaceKey <spaceKey>", "The key of the destination space")
            .action(async cmd => {
                await new PackageCommand().pushPackage(cmd.profile, cmd.spaceKey, cmd.file, cmd.newKey, cmd.overwrite);
                process.exit();
            });

        return program;
    }

    public static packages(program: Command): Command {
        program
            .command("packages")
            .description("Command to push packages to Studio")
            .option("-p, --profile <profile>", "Profile which you want to use to push the packages")
            .requiredOption("--spaceKey <spaceKey>", "The key of the destination space")
            .action(async cmd => {
                await new PackageCommand().pushPackages(cmd.profile, cmd.spaceKey);
                process.exit();
            });

        return program;
    }
}

Push.analysisBookmarks(program);
Push.ctp(program);
Push.skill(program);
Push.widget(program);
Push.dataPool(program);
Push.dataPools(program);
Push.asset(program);
Push.assets(program);
Push.package(program);
Push.packages(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
