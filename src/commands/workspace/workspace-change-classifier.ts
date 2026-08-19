import * as path from "node:path";
import { ClassifiedWorkspaceChange, ExpectedWorkspaceFile } from "./workspace.models";

export function classifyWorkspaceChanges(
    expectedFiles: ExpectedWorkspaceFile[],
    visibleFiles: Map<string, string>,
    moveHints: Record<string, string>
): ClassifiedWorkspaceChange[] {
    const changes: ClassifiedWorkspaceChange[] = [];
    const consumedPaths = new Set<string>();
    const missing: ExpectedWorkspaceFile[] = [];

    expectedFiles.forEach(file => {
        const hint = moveHints[file.nodeKey];
        if (!file.digest) {
            if (hint || !visibleFiles.has(file.path)) {
                changes.push({ nodeKey: file.nodeKey, path: hint || file.path, status: "unresolved" });
                return;
            }
            consumedPaths.add(file.path);
            changes.push({ nodeKey: file.nodeKey, path: file.path, status: "added" });
            return;
        }
        if (hint && hint !== file.path) {
            if (visibleFiles.has(file.path) || !visibleFiles.has(hint) || consumedPaths.has(hint)) {
                changes.push({ nodeKey: file.nodeKey, path: hint, status: "unresolved" });
                if (visibleFiles.has(hint)) {
                    consumedPaths.add(hint);
                }
                if (visibleFiles.has(file.path)) {
                    consumedPaths.add(file.path);
                }
                return;
            }
            consumedPaths.add(hint);
            changes.push({
                nodeKey: file.nodeKey,
                path: hint,
                status: visibleFiles.get(hint) === file.digest ? "moved" : "moved, modified",
            });
            return;
        }
        if (visibleFiles.has(file.path)) {
            consumedPaths.add(file.path);
            if (visibleFiles.get(file.path) !== file.digest) {
                changes.push({ nodeKey: file.nodeKey, path: file.path, status: "modified" });
            }
            return;
        }
        missing.push(file);
    });

    const missingByDigest = groupBy(missing, file => file.digest!);
    missingByDigest.forEach((files, digest) => {
        const candidates = [...visibleFiles.entries()]
            .filter(([filePath, visibleDigest]) => !consumedPaths.has(filePath) && visibleDigest === digest)
            .map(([filePath]) => filePath);
        if (files.length === 1 && candidates.length === 1) {
            consumedPaths.add(candidates[0]);
            changes.push({ nodeKey: files[0].nodeKey, path: candidates[0], status: "moved" });
            missing.splice(missing.indexOf(files[0]), 1);
            return;
        }
        if (candidates.length > 0) {
            files.forEach(file => {
                changes.push({ nodeKey: file.nodeKey, path: file.path, status: "unresolved" });
                missing.splice(missing.indexOf(file), 1);
            });
            candidates.forEach(filePath => {
                consumedPaths.add(filePath);
                changes.push({ path: filePath, status: "unresolved" });
            });
        }
    });

    const newPaths = [...visibleFiles.keys()].filter(filePath => !consumedPaths.has(filePath));
    possibleMovedAndEdited(missing, newPaths).forEach(([file, filePath]) => {
        changes.push({ nodeKey: file.nodeKey, path: filePath, status: "unresolved" });
        missing.splice(missing.indexOf(file), 1);
        newPaths.splice(newPaths.indexOf(filePath), 1);
    });
    missing.forEach(file => changes.push({ nodeKey: file.nodeKey, path: file.path, status: "deleted" }));
    newPaths.forEach(filePath => changes.push({ path: filePath, status: "added" }));

    return changes.sort((left, right) => left.path.localeCompare(right.path) || left.status.localeCompare(right.status));
}

function possibleMovedAndEdited(
    missing: ExpectedWorkspaceFile[],
    newPaths: string[]
): Array<[ExpectedWorkspaceFile, string]> {
    const pairs: Array<[ExpectedWorkspaceFile, string]> = [];
    const remainingPaths = new Set(newPaths);
    missing.forEach(file => {
        const matchingBasenames = [...remainingPaths].filter(
            filePath => path.posix.basename(filePath).toLowerCase() === path.posix.basename(file.path).toLowerCase()
        );
        if (matchingBasenames.length === 1) {
            pairs.push([file, matchingBasenames[0]]);
            remainingPaths.delete(matchingBasenames[0]);
        }
    });
    return pairs;
}

function groupBy<T>(values: T[], key: (value: T) => string): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    values.forEach(value => {
        const groupKey = key(value);
        groups.set(groupKey, [...(groups.get(groupKey) || []), value]);
    });
    return groups;
}
