import { HttpClient } from "../../core/http/http-client";
import { Context } from "../../core/command/cli-context";
import {
    CreateDeploymentRequest,
    DeployableTransport,
    DeploymentStatus,
    DeploymentTransport,
    GetDeploymentsRequest,
    TargetTransport,
} from "./deployment.interfaces";
import { FatalError } from "../../core/utils/logger";

export class DeploymentApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async createDeployment(request: CreateDeploymentRequest): Promise<DeploymentTransport> {
        if (!request.packageKey || request.packageKey.trim() === "") {
            throw new FatalError("Package key is required to create a deployment.");
        }
        if (!request.packageVersion || request.packageVersion.trim() === "") {
            throw new FatalError("Package version is required to create a deployment.");
        }
        if (!request.deployableType || request.deployableType.trim() === "") {
            throw new FatalError("Deployable type is required to create a deployment.");
        }
        if (!request.targetId || request.targetId.trim() === "") {
            throw new FatalError("Target ID is required to create a deployment.");
        }

        return this.httpClient()
            .post("/pacman/api/deployments", request)
            .catch((e) => {
                throw new FatalError(`Problem creating deployment: ${e}`);
            });
    }

    public async getDeployments(filter: GetDeploymentsRequest): Promise<DeploymentTransport[]> {
        const queryParams = new URLSearchParams();

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
            .catch((e) => {
                throw new FatalError(`Problem getting deployments: ${e}`);
            });
    }

    public async getActiveDeploymentsForPackage(
        packageKey: string,
        targetIds?: string[],
        limit = 100,
        offset = 0
    ): Promise<DeploymentTransport[]> {
        const queryParams = new URLSearchParams();
        queryParams.set("limit", limit.toString());
        queryParams.set("offset", offset.toString());

        if (targetIds && targetIds.length > 0) {
            queryParams.set("targetIds", targetIds.join(","));
        }

        return this.httpClient()
            .get(`/pacman/api/deployments/packages/${packageKey}/active?${queryParams.toString()}`)
            .catch((e) => {
                throw new FatalError(`Problem getting active deployments for package ${packageKey}: ${e}`);
            });
    }

    public async getActiveDeploymentForTarget(targetId: string): Promise<DeploymentTransport> {
        return this.httpClient()
            .get(`/pacman/api/deployments/targets/${targetId}/active`)
            .catch((e) => {
                throw new FatalError(`Problem getting active deployment for target ${targetId}: ${e}`);
            });
    }

    public async getTargets(deployableType: string, packageKey?: string): Promise<TargetTransport[]> {
        const queryParams = new URLSearchParams();
        queryParams.set("deployableType", deployableType);

        if (packageKey) {
            queryParams.set("packageKey", packageKey);
        }

        return this.httpClient()
            .get(`/pacman/api/deployments/targets?${queryParams.toString()}`)
            .catch((e) => {
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
            .catch((e) => {
                throw new FatalError(`Problem getting deployables: ${e}`);
            });
    }
}