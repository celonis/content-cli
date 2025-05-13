import { Injectable } from '@nestjs/common';
import {CommandRunner, SubCommand} from "nest-commander";
import {BatchImportExportService} from "../batch-import-export.service";

@Injectable()
@SubCommand({
    name: 'list',
    description: 'List all packages',
})
export class ConfigListCommand extends CommandRunner {

    private readonly batchImportExportService: BatchImportExportService;

    constructor(batchImportExportService: BatchImportExportService) {
        super();
        this.batchImportExportService = batchImportExportService;
    }

    run(passedParams: string[], options?: Record<string, any>): Promise<void> {
        return this.batchImportExportService.listActivePackages(options?.flavors ?? []);
    }
}