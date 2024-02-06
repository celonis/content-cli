import AdmZip = require("adm-zip");
import {
    DependencyTransport,
    NodeExportTransport,
    PackageManifestTransport
} from "../../src/interfaces/package-export-transport";
import {stringify} from "../../src/util/yaml";

export class ConfigUtils {

    public static buildBatchExportZip(manifest: PackageManifestTransport[], packageZips: AdmZip[]): AdmZip {

        const zipExport = new AdmZip();
        zipExport.addFile("manifest.yml", Buffer.from(stringify(manifest)));
        packageZips.forEach(packageZip => {
            const fileName = `${packageZip.getZipComment()}.zip`
            packageZip.addZipComment("")
            zipExport.addFile(fileName, packageZip.toBuffer());
        })

        return zipExport;
    }

    public static buildExportPackageZip(packageNode: NodeExportTransport, childNodes: NodeExportTransport[], version: string): AdmZip {
        const zipExport = new AdmZip();

        zipExport.addFile("package.yml", Buffer.from(stringify(packageNode)));
        zipExport.addFile("nodes/", Buffer.alloc(0));

        childNodes.forEach(child => {
            zipExport.addFile(`nodes/${child.key}.yml`, Buffer.from(stringify(child)));
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

    public static buildPackageNode(key: string, serializedContent: string): NodeExportTransport {
        return {
            key,
            parentNodeKey: key,
            packageNodeKey: key,
            name: "name",
            type: "PACKAGE",
            exportSerializationType: "YAML",
            serializedContent,
            schemaVersion: 1,
            unversionedMetadata: {},
            versionedMetdata: {},
            invalidContent: false,
            serializedDocument: null
        };
    }

    public static buildChildNode(key: string, parentKey: string, type: string): NodeExportTransport {
        return {
            key,
            parentNodeKey: parentKey,
            packageNodeKey: parentKey,
            name: "name",
            type: type,
            exportSerializationType: "YAML",
            serializedContent: "",
            schemaVersion: 1,
            unversionedMetadata: {},
            versionedMetdata: {},
            invalidContent: false,
            serializedDocument: null
        };
    }
}