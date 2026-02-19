import {
  ConfigurationChangeTransport,
  NodeConfigurationChangeType,
} from "./diff-package.interfaces";

export interface GetNodeDiffRequest {
  packageKey: string;
  nodeKey: string;
  baseVersion: string;
  compareVersion: string;
}

export interface NodeConfigurationDiffTransport {
  packageKey: string;
  nodeKey: string;
  parentNodeKey: string;
  name: string;
  type: string;
  invalidContent: boolean;
  changeDate: string;
  updatedBy: string;
  changeType: NodeConfigurationChangeType;
  changes: ConfigurationChangeTransport;
  metadataChanges: ConfigurationChangeTransport;
}
