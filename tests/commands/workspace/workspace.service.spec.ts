import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import AdmZip = require("adm-zip");
import { WorkspaceService } from "../../../src/commands/workspace/workspace.service";
import { testContext } from "../../utls/test-context";
import { mockAxiosGet, mockAxiosPost, mockedAxiosInstance } from "../../utls/http-requests-mock";

const PACKAGE_KEY = "pkg-1";
const CHECKOUT_URL = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${PACKAGE_KEY}/file-archive`;
const PUSH_URL = "https://myTeam.celonis.cloud/pacman/api/core/staging/packages/file-archive";

function digest(value: string): string {
    return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function index(basePath: string = "Guides/Guide.md", currentPath: string = basePath): object {
    return {
        version: 1,
        packageKey: PACKAGE_KEY,
        files: [{ nodeKey: "node-1", basePath, currentPath, digest: digest("original") }],
    };
}

function writeWorkspace(): void {
    fs.mkdirSync(path.join(process.cwd(), ".pacman"), { recursive: true });
    fs.mkdirSync(path.join(process.cwd(), "Guides"), { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "original");
    fs.writeFileSync(path.join(process.cwd(), ".pacman", "index.json"), JSON.stringify(index()));
}

describe("Workspace service", () => {
    beforeEach(() => {
        [".pacman", "Guides", "Pages", PACKAGE_KEY].forEach((entry) =>
            fs.rmSync(path.join(process.cwd(), entry), { recursive: true, force: true })
        );
    });

    it("checks out a filesystem archive", async () => {
        const zip = new AdmZip();
        zip.addFile(".pacman/index.json", Buffer.from(JSON.stringify(index())));
        zip.addFile("Guides/Guide.md", Buffer.from("original"));
        mockAxiosGet(CHECKOUT_URL, zip.toBuffer());

        await new WorkspaceService(testContext).checkout(PACKAGE_KEY);

        expect(fs.readFileSync(path.join(process.cwd(), PACKAGE_KEY, "Guides", "Guide.md"), "utf-8")).toBe("original");
    });

    it("records a move and reports later content changes together", () => {
        writeWorkspace();
        const service = new WorkspaceService(testContext);

        service.move("Guides/Guide.md", "Pages/Guide.md");
        fs.writeFileSync(path.join(process.cwd(), "Pages", "Guide.md"), "changed");

        expect(service.status()).toEqual([{ path: "Pages/Guide.md", status: "moved, modified" }]);
        expect(JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "index.json"), "utf-8"))).toMatchObject({
            files: [{ nodeKey: "node-1", currentPath: "Pages/Guide.md" }],
        });
    });

    it("records a move already performed by another tool", () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), "Pages"));
        fs.renameSync(path.join(process.cwd(), "Guides", "Guide.md"), path.join(process.cwd(), "Pages", "Guide.md"));

        new WorkspaceService(testContext).move("Guides/Guide.md", "Pages/Guide.md", true);

        expect(fs.existsSync(path.join(process.cwd(), "Pages", "Guide.md"))).toBe(true);
    });

    it("pushes the workspace archive", async () => {
        writeWorkspace();
        mockAxiosPost(PUSH_URL, {});

        await new WorkspaceService(testContext).push(undefined, true);

        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
            PUSH_URL,
            expect.anything(),
            expect.objectContaining({ params: { overwrite: true } })
        );
    });
});
