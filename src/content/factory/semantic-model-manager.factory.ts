import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { SemanticModelManager } from "../manager/semantic-model-manager";

export class SemanticModelManagerFactory {
    public createManager(id: string, filename: string): SemanticModelManager {
        const semanticModelManager = new SemanticModelManager();
        semanticModelManager.id = id;
        if (filename !== null) {
            semanticModelManager.content = this.readFile(filename);
        }
        return semanticModelManager;
    }

    public createManagers(): SemanticModelManager[] {
        const semanticModels = fs.readdirSync(process.cwd());
        return semanticModels
            .filter(filePath => {
                if (!this.isSemanticModelFilePath(filePath)) {
                    return false;
                }

                const file = fs.lstatSync(filePath);
                return file.isFile();
            })
            .map(semanticModel => {
                const semanticModelManager = new SemanticModelManager();
                semanticModelManager.content = this.readFile(semanticModel);
                return semanticModelManager;
            });
    }

    private isSemanticModelFilePath(filePath: string): boolean {
        return (
            filePath.startsWith(SemanticModelManager.SEMANTIC_MODEL_FILE_PREFIX) &&
            (filePath.endsWith("yml") || filePath.endsWith("yaml"))
        );
    }

    private readFile(filename: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.readFileSync(path.resolve(process.cwd(), filename), { encoding: "utf-8" });
    }
}
