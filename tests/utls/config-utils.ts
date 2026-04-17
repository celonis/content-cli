import AdmZip = require("adm-zip");
import {
    DependencyTransport, NodeConfiguration,
    NodeExportTransport,
    PackageManifestTransport, StudioPackageManifest,
} from "../../src/commands/configuration-management/interfaces/package-export.interfaces";
import { stringify } from "../../src/core/utils/json";
import { SpaceTransport } from "../../src/commands/studio/interfaces/space.interface";
import { FileConstants } from "../../src/core/utils/file.constants";

export class ConfigUtils {

    public static buildBatchExportZipWithStudioManifest(manifest: PackageManifestTransport[], studioManifest: StudioPackageManifest[], packageZips: AdmZip[]): AdmZip {

        const zipExport = new AdmZip();
        zipExport.addFile("manifest.json", Buffer.from(stringify(manifest)), "", FileConstants.DEFAULT_FILE_PERMISSIONS);
        zipExport.addFile("studio.json", Buffer.from(stringify(studioManifest)), "", FileConstants.DEFAULT_FILE_PERMISSIONS);
        packageZips.forEach(packageZip => {
            const fileName = `${packageZip.getZipComment()}.zip`
            packageZip.addZipComment("")
            zipExport.addFile(fileName, packageZip.toBuffer(), "", FileConstants.DEFAULT_FILE_PERMISSIONS);
        })

        return zipExport;
    }
    public static buildBatchExportZip(manifest: PackageManifestTransport[], packageZips: AdmZip[]): AdmZip {

        const zipExport = new AdmZip();
        zipExport.addFile("manifest.json", Buffer.from(stringify(manifest)), "", FileConstants.DEFAULT_FILE_PERMISSIONS);
        packageZips.forEach(packageZip => {
            const fileName = `${packageZip.getZipComment()}.zip`
            packageZip.addZipComment("")
            zipExport.addFile(fileName, packageZip.toBuffer(), "", FileConstants.DEFAULT_FILE_PERMISSIONS);
        })

        return zipExport;
    }

    public static buildExportPackageZip(packageNode: NodeExportTransport, childNodes: NodeExportTransport[], version: string): AdmZip {
        const zipExport = new AdmZip();

        zipExport.addFile("package.json", Buffer.from(stringify(packageNode)), "", FileConstants.DEFAULT_FILE_PERMISSIONS);
        zipExport.addFile("nodes/", Buffer.alloc(0), "", FileConstants.DEFAULT_FILE_PERMISSIONS);

        childNodes.forEach(child => {
            zipExport.addFile(`nodes/${child.key}.json`, Buffer.from(stringify(child)), "", FileConstants.DEFAULT_FILE_PERMISSIONS);
        });

       zipExport.addZipComment(`${packageNode.key}_${version}`);

        return zipExport;
    }

    public static buildManifestForKeyAndFlavor(key: string, flavor: string, dependenciesByVersion?: Map<string, DependencyTransport[]>): PackageManifestTransport {
        return {
            packageKey: key,
            flavor: flavor,
            activeVersion: "",
            dependenciesByVersion: dependenciesByVersion ?? {} as Map<string, DependencyTransport[]>
        };
    }

    public static buildManifestForKeyAndFlavorAndVersion(key: string, flavor: string, version: string, dependenciesByVersion?: Map<string, DependencyTransport[]>): PackageManifestTransport {
        return {
            packageKey: key,
            flavor: flavor,
            activeVersion: version,
            dependenciesByVersion: dependenciesByVersion ?? {} as Map<string, DependencyTransport[]>
        };
    }

    public static buildPackageNode(key: string, configuration: NodeConfiguration): NodeExportTransport {
        return {
            key,
            parentNodeKey: key,
            name: "name",
            type: "PACKAGE",
            exportSerializationType: "YAML",
            configuration: configuration,
            schemaVersion: 1,
            invalidContent: false,
            serializedDocument: null,
            spaceId: null
        };
    }

    public static buildChildNode(key: string, parentKey: string, type: string): NodeExportTransport {
        return {
            key,
            parentNodeKey: parentKey,
            name: "name",
            type: type,
            exportSerializationType: "YAML",
            configuration: {},
            schemaVersion: 1,
            invalidContent: false,
            serializedDocument: null,
            spaceId: null
        };
    }

    public static buildStudioManifestForKeyWithSpace(key: string, spaceName: string, spaceId: string): StudioPackageManifest {
        const space: Partial<SpaceTransport> = {
            name: spaceName
        };

        if (spaceId) {
            space.id = spaceId;
        }

        return {
            packageKey: key,
            space: space,
            runtimeVariableAssignments: []
        };
    }
}
