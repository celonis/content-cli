import { URLSearchParams } from "url";
import { HttpClient } from "../../../../core/http/http-client";
import { Context } from "../../../../core/command/cli-context";
import { FatalError } from "../../../../core/utils/logger";
import {
    BranchingSettingsTransport,
    BranchTransport,
    CreateBranchTransport,
    MergeBranchTransport,
    MergePreviewRequestTransport,
    MergePreviewTransport,
    PackageVersionCreatedTransport,
} from "../interfaces/branch.interfaces";

export class BranchApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async configureBranchingSettings(packageKey: string, transport: BranchingSettingsTransport): Promise<BranchingSettingsTransport> {
        return this.httpClient()
            .put(`/pacman/api/core/packages/${packageKey}/branch-settings`, transport)
            .catch(e => {
                throw new FatalError(`Problem updating branch settings for package ${packageKey}: ${e}`);
            });
    }

    public async createBranch(packageKey: string, transport: CreateBranchTransport, validate: boolean = false): Promise<BranchTransport | void> {
        const params = new URLSearchParams();
        if (validate) {
            params.set("validate", "true");
        }
        const query = params.toString().length ? `?${params.toString()}` : "";

        return this.httpClient()
            .post(`/pacman/api/core/packages/${packageKey}/branches${query}`, transport)
            .catch(e => {
                throw new FatalError(`Problem creating branch '${transport.branchKey}' from package ${packageKey}: ${e}`);
            });
    }

    public async listBranches(packageKey: string): Promise<BranchTransport[]> {
        return this.httpClient()
            .get(`/pacman/api/core/packages/${packageKey}/branches`)
            .catch(e => {
                throw new FatalError(`Problem listing branches for package ${packageKey}: ${e}`);
            });
    }

    public async mergePreview(packageKey: string, transport: MergePreviewRequestTransport): Promise<MergePreviewTransport> {
        return this.httpClient()
            .post(`/pacman/api/core/staging/packages/${packageKey}/merge/preview`, transport)
            .catch(e => {
                throw new FatalError(`Problem previewing merge into package ${packageKey} from ${transport.sourceKey}@${transport.sourceVersion}: ${e}`);
            });
    }

    public async merge(packageKey: string, transport: MergeBranchTransport): Promise<PackageVersionCreatedTransport> {
        return this.httpClient()
            .post(`/pacman/api/core/staging/packages/${packageKey}/merge`, transport)
            .catch(e => {
                throw new FatalError(`Problem merging into package ${packageKey} from ${transport.sourceKey}@${transport.sourceVersion}: ${e}`);
            });
    }

    public async deleteBranch(branchPackageKey: string): Promise<void> {
        return this.httpClient()
            .delete(`/pacman/api/core/staging/packages/${branchPackageKey}/purge`)
            .catch(e => {
                throw new FatalError(`Problem deleting branch ${branchPackageKey}: ${e}`);
            });
    }
}
