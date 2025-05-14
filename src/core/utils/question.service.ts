import * as readline from "readline";
import { ReadLine } from "readline";

/**
 * Simple method to get input from the user/console using ReadLine. The
 * class must be closed in order to avoid the CLI to not terminate properly.
 */
export class QuestionService {

    readLine: ReadLine;

    constructor() {
        this.readLine = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true,
        });
    }

    async ask(question: string): Promise<string> {
        return new Promise<string>((resolve) => {
            this.readLine.question(question, input => resolve(input));
        });   
    }

    close() {
        this.readLine.close();
    }
}
