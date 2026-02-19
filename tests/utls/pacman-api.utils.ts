import { PackageExportTransport } from "../../src/commands/configuration-management/interfaces/package-export.interfaces";
import { ContentNodeTransport } from "../../src/commands/studio/interfaces/package-manager.interfaces";
import { SpaceTransport } from "../../src/commands/studio/interfaces/space.interface";

export class PacmanApiUtils {
  public static buildPackageExportTransport = (
    key: string,
    name: string,
  ): PackageExportTransport => {
    return {
      id: "",
      key,
      name,
      changeDate: null,
      activatedDraftId: "",
      workingDraftId: "",
      flavor: "",
      version: "",
      dependencies: null,
    };
  };

  public static buildContentNodeTransport = (
    key: string,
    spaceId: string,
  ): ContentNodeTransport => {
    return {
      id: "",
      key,
      name: "",
      rootNodeKey: "",
      workingDraftId: "",
      activatedDraftId: "",
      rootNodeId: "",
      assetMetadataTransport: null,
      spaceId,
    };
  };

  public static buildSpaceTransport = (
    id: string,
    name: string = "space-name",
    iconReference: string = "icon",
  ): SpaceTransport => {
    return {
      id,
      name,
      iconReference,
    };
  };
}
