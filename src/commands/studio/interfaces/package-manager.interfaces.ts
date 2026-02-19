export interface AssetMetadataTransport {
  hidden: boolean;
}

export interface ContentNodeTransport {
  id: string;
  key: string;
  name: string;
  rootNodeKey: string;
  workingDraftId: string;
  activatedDraftId: string;
  rootNodeId: string;
  assetMetadataTransport: AssetMetadataTransport;
  spaceId: string;
}

export interface ActivatePackageTransport {
  packageKey: string;
  version: string;
  publishMessage: string;
  nodeIdsToExclude: string[];
}

export interface DataModelTransport {
  id: string;
  name: string;
  poolId: string;
}

export interface PackageDependencyTransport {
  id: string;
  key: string;
  name: string;
  version: string;
  rootNodeId: string;
  external: boolean;
  draftId: string;
  updateAvailable: boolean;
  deleted: boolean;
}

export interface AssetMetadataTransport {
  hidden: boolean;
}

export interface PackageWithVariableAssignments {
  id: string;
  key: string;
  name: string;
  createdBy: string;
  spaceId: string;
  variableAssignments: VariablesAssignments[];
}

export interface VariablesAssignments {
  key: string;
  value: object;
  type: string;
}

export interface VariableDefinition {
  key: string;
  type: PackageManagerVariableType;
  description?: string;
  source?: string;
  runtime?: boolean;
  metadata?: object;
}

export enum PackageManagerVariableType {
  DATA_MODEL = "DATA_MODEL",
  CONNECTION = "CONNECTION",
  ASSIGNMENT_RULE = "ASSIGNMENT_RULE",
  PLAIN_TEXT = "PLAIN_TEXT",
}

export interface PackageHistoryTransport {
  id: string;
  key: string;
  name: string;
  version: string;
}

export interface StudioDataModelTransport {
  node: StudioComputeNodeDescriptor;
  dataPool: ComputePoolTransport;
}

export interface StudioComputeNodeDescriptor {
  name: string;
  dataModelId: string;
  poolId: string;
}

export interface ComputePoolTransport {
  id: string;
  name: string;
}
