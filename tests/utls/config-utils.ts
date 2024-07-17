import AdmZip = require("adm-zip");
import {
    DependencyTransport, NodeConfiguration,
    NodeExportTransport,
    PackageManifestTransport, StudioPackageManifest,
} from "../../src/interfaces/package-export-transport";
import {stringify} from "../../src/util/json";
import {SpaceTransport} from "../../src/interfaces/save-space.interface";

export class ConfigUtils {

    public static buildBatchExportZipWithStudioManifest(manifest: PackageManifestTransport[], studioManifest: StudioPackageManifest[], packageZips: AdmZip[]): AdmZip {

        const zipExport = new AdmZip();
        zipExport.addFile("manifest.json", Buffer.from(stringify(manifest)));
        zipExport.addFile("studio.json", Buffer.from(stringify(studioManifest)));
        packageZips.forEach(packageZip => {
            const fileName = `${packageZip.getZipComment()}.zip`
            packageZip.addZipComment("")
            zipExport.addFile(fileName, packageZip.toBuffer());
        })

        return zipExport;
    }
    public static buildBatchExportZip(manifest: PackageManifestTransport[], packageZips: AdmZip[]): AdmZip {

        const zipExport = new AdmZip();
        const str = stringify(manifest);
        zipExport.addFile("manifest.json", Buffer.from(stringify(manifest)));
        packageZips.forEach(packageZip => {
            const fileName = `${packageZip.getZipComment()}.zip`
            packageZip.addZipComment("")
            zipExport.addFile(fileName, packageZip.toBuffer());
        })

        return zipExport;
    }

    public static buildExportPackageZip(packageNode: NodeExportTransport, childNodes: NodeExportTransport[], version: string): AdmZip {
        const zipExport = new AdmZip();

        zipExport.addFile("package.json", Buffer.from(stringify(packageNode)));
        zipExport.addFile("nodes/", Buffer.alloc(0));

        childNodes.forEach(child => {
            zipExport.addFile(`nodes/${child.key}.json`, Buffer.from(stringify(child)));
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