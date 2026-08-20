import { createHash } from "node:crypto";
import * as path from "node:path";
import { GracefulError } from "../../core/utils/logger";
import { WorkspaceNodeMetadata } from "./workspace.models";

const ROOT = "\u0000root";

export function projectWorkspacePaths(nodes: WorkspaceNodeMetadata[], packageKey?: string): Map<string, string> {
    const byKey = new Map<string, WorkspaceNodeMetadata>();
    nodes.forEach(node => {
        if (byKey.has(node.key)) {
            throw new GracefulError(`Duplicate node metadata key: ${node.key}.`);
        }
        byKey.set(node.key, node);
    });
    const candidates = new Map(nodes.map(node => [node.key, candidateSegment(node)]));
    const projected = projectedSegments(nodes, candidates, packageKey);
    const paths = new Map<string, string>();
    const resolving = new Set<string>();
    const resolve = (node: WorkspaceNodeMetadata): string => {
        const cached = paths.get(node.key);
        if (cached) {
            return cached;
        }
        if (resolving.has(node.key)) {
            throw new GracefulError(`Circular node hierarchy at ${node.key}.`);
        }
        resolving.add(node.key);
        const parentKey = normalizedParent(node.parentNodeKey, packageKey);
        const parent = parentKey === ROOT ? undefined : byKey.get(parentKey);
        if (parentKey !== ROOT && (!parent || !isFolder(parent))) {
            throw new GracefulError(`Invalid parent metadata for node ${node.key}.`);
        }
        const segment = projected.get(node.key)!;
        const value = parent ? `${resolve(parent)}/${segment}` : segment;
        validateVisiblePath(value);
        resolving.delete(node.key);
        paths.set(node.key, value);
        return value;
    };
    nodes.forEach(resolve);
    return paths;
}

export function projectedLeafAfterMove(
    nodes: WorkspaceNodeMetadata[],
    nodeKey: string,
    targetParentKey: string | undefined,
    packageKey?: string
): string {
    if (!nodes.some(node => node.key === nodeKey)) {
        throw new GracefulError(`Tracked node metadata is missing: ${nodeKey}.`);
    }
    const moved = nodes.map(node =>
        node.key === nodeKey ? { ...node, parentNodeKey: targetParentKey || null } : node
    );
    const candidates = new Map(moved.map(node => [node.key, candidateSegment(node)]));
    return projectedSegments(moved, candidates, packageKey).get(nodeKey)!;
}

function projectedSegments(
    nodes: WorkspaceNodeMetadata[],
    candidates: Map<string, string>,
    packageKey?: string
): Map<string, string> {
    const projected = new Map(candidates);
    const byParent = groupBy(nodes, node => normalizedParent(node.parentNodeKey, packageKey));
    byParent.forEach(siblings => {
        groupBy(siblings, node => candidates.get(node.key)!.toLowerCase()).forEach(group => {
            if (group.length > 1) {
                disambiguate(group, siblings, candidates, projected);
            }
        });
    });
    return projected;
}

function disambiguate(
    group: WorkspaceNodeMetadata[],
    siblings: WorkspaceNodeMetadata[],
    candidates: Map<string, string>,
    projected: Map<string, string>
): void {
    const hashes = new Map(group.map(node => [node.key, sha256(node.key)]));
    const groupKeys = new Set(group.map(node => node.key));
    const occupied = new Set(
        siblings.filter(node => !groupKeys.has(node.key)).map(node => candidates.get(node.key)!.toLowerCase())
    );
    let length = 12;
    while (length < 64) {
        const prefixes = new Set<string>();
        const uniquePrefixes = group.every(node => prefixes.add(hashes.get(node.key)!.slice(0, length)));
        const available = group.every(
            node =>
                !occupied.has(
                    addSuffix(
                        candidates.get(node.key)!,
                        isFolder(node),
                        hashes.get(node.key)!.slice(0, length)
                    ).toLowerCase()
                )
        );
        if (uniquePrefixes && available) {
            break;
        }
        length = Math.min(64, length + 4);
    }
    group.forEach(node =>
        projected.set(
            node.key,
            addSuffix(candidates.get(node.key)!, isFolder(node), hashes.get(node.key)!.slice(0, length))
        )
    );
}

function candidateSegment(node: WorkspaceNodeMetadata): string {
    const extension = isFolder(node) ? "" : `.${fileExtension(node.type)}`;
    const segment = `${node.name}${extension}`;
    if (
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\") ||
        [...segment].some(character => {
            const codePoint = character.codePointAt(0)!;
            return codePoint < 32 || codePoint === 127;
        })
    ) {
        throw new GracefulError(`Invalid derived filesystem name for node ${node.key}.`);
    }
    return segment;
}

function fileExtension(assetType: string): string {
    switch (assetType.toUpperCase()) {
        case "MARKDOWN_FILE":
            return "md";
        case "HTML_CANVAS":
            return "html";
        default:
            return "json";
    }
}

function addSuffix(segment: string, folder: boolean, suffix: string): string {
    if (folder) {
        return `${segment}~${suffix}`;
    }
    const extension = path.posix.extname(segment);
    return extension ? `${segment.slice(0, -extension.length)}~${suffix}${extension}` : `${segment}~${suffix}`;
}

function validateVisiblePath(value: string): void {
    const segments = value.split("/");
    const first = segments[0].toLowerCase();
    if (first === ".pacman" || first === ".git") {
        throw new GracefulError(`Invalid derived workspace path: ${value}.`);
    }
}

function normalizedParent(parentNodeKey: string | null | undefined, packageKey?: string): string {
    return !parentNodeKey || parentNodeKey === packageKey ? ROOT : parentNodeKey;
}

function isFolder(node: WorkspaceNodeMetadata): boolean {
    return node.type.toUpperCase() === "FOLDER";
}

function sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

function groupBy<T>(values: T[], key: (value: T) => string): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    values.forEach(value => {
        const groupKey = key(value);
        groups.set(groupKey, [...(groups.get(groupKey) || []), value]);
    });
    return groups;
}
