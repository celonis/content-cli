import {HttpClient} from "../../core/http/http-client";
import {Context} from "../../core/command/cli-context";
import {
    CreateDeploymentRequest,
    DeployableTransport,
    DeploymentStatus,
    DeploymentTransport,
    GetDeploymentsRequest,
    TargetTransport,
} from "./deployment.interfaces";
import {FatalError} from "../../core/utils/logger";

export class DeploymentApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async createDeployment(request: CreateDeploymentRequest): Promise<DeploymentTransport> {
        return this.httpClient()
            .post("/pacman/api/deployments", request)
            .catch(e => {
                throw new FatalError(`Problem creating deployment: ${e}`);
            });
    }

    public async getDeployments(
        filter: GetDeploymentsRequest,
        limit?: string,
        offset?: string
    ): Promise<DeploymentTransport[]> {
        const queryParams = new URLSearchParams();
        this.addPaginationParams(queryParams, limit, offset);

        if (filter.packageKey) {
            queryParams.set("packageKey", filter.packageKey);
        }
        if (filter.targetId) {
            queryParams.set("targetId", filter.targetId);
        }
        if (filter.deployableType) {
            queryParams.set("deployableType", filter.deployableType);
        }
        if (filter.status && filter.status !== DeploymentStatus.UNKNOWN) {
            queryParams.set("status", filter.status);
        }
        if (filter.createdBy) {
            queryParams.set("createdBy", filter.createdBy);
        }

        return this.httpClient()
            .get(`/pacman/api/deployments/history?${queryParams.toString()}`)
            .catch(e => {
                throw new FatalError(`Problem getting deployments: ${e}`);
            });
    }

    public async getActiveDeploymentsForPackage(
        packageKey: string,
        targetIds?: string[],
        limit?: string,
        offset?: string
    ): Promise<DeploymentTransport[]> {
        const queryParams = new URLSearchParams();
        this.addPaginationParams(queryParams, limit, offset);

        if (targetIds && targetIds.length > 0) {
            queryParams.set("targetIds", targetIds.join(","));
        }

        return this.httpClient()
            .get(`/pacman/api/deployments/packages/${packageKey}/active?${queryParams.toString()}`)
            .catch(e => {
                throw new FatalError(`Problem getting active deployments for package ${packageKey}: ${e}`);
            });
    }

    public async getActiveDeploymentForTarget(targetId: string): Promise<DeploymentTransport> {
        return this.httpClient()
            .get(`/pacman/api/deployments/targets/${targetId}/active`)
            .catch(e => {
                throw new FatalError(`Problem getting active deployment for target ${targetId}: ${e}`);
            });
    }

    public async getTargets(deployableType: string, packageKey: string): Promise<TargetTransport[]> {
        const queryParams = new URLSearchParams();
        queryParams.set("deployableType", deployableType);
        queryParams.set("packageKey", packageKey);

        return this.httpClient()
            .get(`/pacman/api/deployments/targets?${queryParams.toString()}`)
            .catch(e => {
                throw new FatalError(`Problem getting targets: ${e}`);
            });
    }

    public async getDeployables(flavor?: string): Promise<DeployableTransport[]> {
        const queryParams = new URLSearchParams();
        if (flavor) {
            queryParams.set("flavor", flavor);
        }

        return this.httpClient()
            .get(`/pacman/api/deployments/deployables?${queryParams.toString()}`)
            .catch(e => {
                throw new FatalError(`Problem getting deployables: ${e}`);
            });
    }

    private addPaginationParams(queryParams: URLSearchParams, limit?: string, offset?: string): void {
        const defaultLimit = 100;
        const defaultOffset = 0;

        const parsedLimit = limit !== undefined && !isNaN(Number(limit)) ? Number(limit) : defaultLimit;
        queryParams.set("limit", parsedLimit.toString());

        const parsedOffset = offset !== undefined && !isNaN(Number(offset)) ? Number(offset) : defaultOffset;
        queryParams.set("offset", parsedOffset.toString());
    }
}
