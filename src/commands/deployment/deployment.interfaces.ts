export interface DeploymentTransport {
    id: string;
    packageKey: string;
    packageVersion: string;
    deployableType: string;
    target: TargetTransport;
    status: DeploymentStatus;
    statusMessage: string;
    createdBy: string;
    createdAt: string;
    deployedAt: string;
}

export interface TargetTransport {
    id: string;
    name: string;
}

export interface DeployableTransport {
    name: string;
    type: string;
    targetType: string;
    flavor: string;
}

export enum DeploymentStatus {
    UNKNOWN = "unknown",
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
}

export interface CreateDeploymentRequest {
    packageKey: string;
    packageVersion: string;
    deployableType: string;
    targetId: string;
}

export interface GetDeploymentsRequest {
    packageKey: string;
    targetId: string;
    deployableType: string;
    status: DeploymentStatus;
    createdBy: string;
}

export function fromString(value: string): DeploymentStatus {
    return (Object.values(DeploymentStatus) as string[]).includes(value)
        ? (value as DeploymentStatus)
        : DeploymentStatus.UNKNOWN;
}
