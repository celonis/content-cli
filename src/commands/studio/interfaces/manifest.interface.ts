import { VariablesAssignments } from "./package-manager.interfaces";

export interface ManifestNodeTransport {
  packageKey: string;
  packageId: string;
  variables: ManifestVariable[];
  space: ManifestSpace;
  dependenciesByVersion: Map<string, ManifestDependency[]>;
}

export interface ManifestVariable extends VariablesAssignments {
  dataPoolName?: string;
  dataModelName?: string;
}

export interface ManifestSpace {
  spaceName: string;
  spaceIcon: string;
}

export interface ManifestDependency {
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
