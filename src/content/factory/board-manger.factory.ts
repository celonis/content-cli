import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { BoardManager } from "../manager/board.manager";

export class BoardManagerFactory {
    public createManager(id: string, filename: string): BoardManager {
        const boardManager = new BoardManager();
        boardManager.id = id;
        if (filename !== null) {
            boardManager.content = this.readFile(filename);
        }
        return boardManager;
    }

    private readFile(filename: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.readFileSync(path.resolve(process.cwd(), filename), { encoding: "utf-8" });
    }
}
