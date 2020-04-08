import { ContentService } from "../services/content.service";
import { BoardManagerFactory } from "../content/factory/board-manger.factory";

export class BoardCommand {
    private contentService = new ContentService();
    private boardManagerFactory = new BoardManagerFactory();

    public async pullBoard(profile: string, id: string) {
        await this.contentService.pull(profile, this.boardManagerFactory.createManager(id, null));
    }

    public async pushBoard(profile: string, filename: string) {
        await this.contentService.push(profile, this.boardManagerFactory.createManager(null, filename));
    }

    public async pushBoards(profile: string) {
        await this.contentService.batchPush(profile, this.boardManagerFactory.createManagers());
    }

    public async updateBoard(profile: string, id: string, filename: string): Promise<any> {
        await this.contentService.update(profile, this.boardManagerFactory.createManager(id, filename));
    }
}
