import * as fs from "fs";
import * as path from "path";

import { WorkflowManager } from "../manager/workflow.manager";
import { FatalError, logger } from "../../util/logger";

export class WorkflowManagerFactory {
    public createManager(id?: string, fileName?: string, packageManager?: boolean): WorkflowManager {
        const workflowManager = new WorkflowManager();
        workflowManager.id = id;

        if (fileName) {
            workflowManager.content = this.readFile(fileName);
        }

        workflowManager.packageManager = packageManager;
        return workflowManager;
    }

    public createManagers(): WorkflowManager[] {
        const filePaths = fs.readdirSync(process.cwd());

        return filePaths
            .filter(filePath => {
                if (!filePath.endsWith("yml") && !filePath.endsWith("yaml")) {
                    return false;
                }

                const file = fs.lstatSync(filePath);
                return file.isFile();
            })
            .map(filePath => {
                return this.createManager(null, filePath);
            });
    }

    private readFile(fileName: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), fileName))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.readFileSync(path.resolve(process.cwd(), fileName), { encoding: "utf-8" });
    }
}
