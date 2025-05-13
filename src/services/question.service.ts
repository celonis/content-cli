import * as readline from "readline";
import { ReadLine } from "readline";

export class QuestionService {
    private static readLine: ReadLine = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    });

    public static async ask(question: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.readLine.question(question, input => resolve(input));
        });
    }
}