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
    const visiblePathIndex = new Map([...visibleFiles.keys()].map(filePath => [filePath.toLowerCase(), filePath]));

    expectedFiles.forEach(file =>
        classifyExpectedFile(
            file,
            visibleFiles,
            visiblePathIndex,
            moveHints[file.nodeKey],
            changes,
            consumedPaths,
            missing
        )
    );

    resolveDigestMoves(missing, visibleFiles, consumedPaths, changes);

    const newPaths = [...visibleFiles.keys()].filter(filePath => !consumedPaths.has(filePath));
    resolveMovedAndEdited(missing, newPaths, changes);
    missing.forEach(file =>
        changes.push({ nodeKey: file.nodeKey, path: file.path, status: file.digest ? "deleted" : "unresolved" })
    );
    newPaths.forEach(filePath => changes.push({ path: filePath, status: "added" }));

    return changes.sort((left, right) => left.path.localeCompare(right.path) || left.status.localeCompare(right.status));
}

function classifyExpectedFile(
    file: ExpectedWorkspaceFile,
    visibleFiles: Map<string, string>,
    visiblePathIndex: Map<string, string>,
    hint: string | undefined,
    changes: ClassifiedWorkspaceChange[],
    consumedPaths: Set<string>,
    missing: ExpectedWorkspaceFile[]
): void {
    const currentPath = visiblePathIndex.get(file.path.toLowerCase());
    if (!file.digest) {
        if (hint || currentPath) {
            classifyNewFile(file, hint, visibleFiles, visiblePathIndex, changes, consumedPaths);
        } else {
            missing.push(file);
        }
        return;
    }
    if (hint) {
        classifyHintedFile(file, hint, visibleFiles, visiblePathIndex, changes, consumedPaths);
        return;
    }
    if (currentPath) {
        consumedPaths.add(currentPath);
        const changed = visibleFiles.get(currentPath) !== file.digest;
        if (currentPath !== file.path) {
            changes.push({ nodeKey: file.nodeKey, path: currentPath, status: changed ? "moved, modified" : "moved" });
        } else if (changed) {
            changes.push({ nodeKey: file.nodeKey, path: currentPath, status: "modified" });
        }
        return;
    }
    missing.push(file);
}

function classifyNewFile(
    file: ExpectedWorkspaceFile,
    hint: string | undefined,
    visibleFiles: Map<string, string>,
    visiblePathIndex: Map<string, string>,
    changes: ClassifiedWorkspaceChange[],
    consumedPaths: Set<string>
): void {
    const target = hint || file.path;
    const targetPath = visiblePathIndex.get(target.toLowerCase());
    const sourcePath = visiblePathIndex.get(file.path.toLowerCase());
    const sourceStillPresent = Boolean(hint && hint.toLowerCase() !== file.path.toLowerCase() && sourcePath);
    if (sourceStillPresent || !targetPath || consumedPaths.has(targetPath)) {
        changes.push({ nodeKey: file.nodeKey, path: target, status: "unresolved" });
        if (targetPath) {
            consumedPaths.add(targetPath);
        }
        if (sourceStillPresent && sourcePath) {
            consumedPaths.add(sourcePath);
        }
        return;
    }
    consumedPaths.add(targetPath);
    changes.push({ nodeKey: file.nodeKey, path: target, status: "added" });
}

function classifyHintedFile(
    file: ExpectedWorkspaceFile,
    hint: string,
    visibleFiles: Map<string, string>,
    visiblePathIndex: Map<string, string>,
    changes: ClassifiedWorkspaceChange[],
    consumedPaths: Set<string>
): void {
    const targetPath = visiblePathIndex.get(hint.toLowerCase());
    const sourcePath = visiblePathIndex.get(file.path.toLowerCase());
    const sourceStillPresent = hint.toLowerCase() !== file.path.toLowerCase() && Boolean(sourcePath);
    if (sourceStillPresent || !targetPath || consumedPaths.has(targetPath)) {
        changes.push({ nodeKey: file.nodeKey, path: hint, status: "unresolved" });
        if (targetPath) {
            consumedPaths.add(targetPath);
        }
        if (sourceStillPresent && sourcePath) {
            consumedPaths.add(sourcePath);
        }
        return;
    }
    consumedPaths.add(targetPath);
    changes.push({
        nodeKey: file.nodeKey,
        path: hint,
        status: visibleFiles.get(targetPath) === file.digest ? "moved" : "moved, modified",
    });
}

function resolveDigestMoves(
    missing: ExpectedWorkspaceFile[],
    visibleFiles: Map<string, string>,
    consumedPaths: Set<string>,
    changes: ClassifiedWorkspaceChange[]
): void {
    groupBy(
        missing.filter(file => file.digest),
        file => file.digest!
    ).forEach((files, digest) => {
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
}

function resolveMovedAndEdited(
    missing: ExpectedWorkspaceFile[],
    newPaths: string[],
    changes: ClassifiedWorkspaceChange[]
): void {
    const missingByBasename = groupBy(missing, file => path.posix.basename(file.path).toLowerCase());
    const pathsByBasename = groupBy(newPaths, filePath => path.posix.basename(filePath).toLowerCase());
    missingByBasename.forEach((files, basename) => {
        const paths = pathsByBasename.get(basename);
        if (!paths) {
            return;
        }
        if (files.length === 1 && paths.length === 1) {
            changes.push({ nodeKey: files[0].nodeKey, path: paths[0], status: "unresolved" });
        } else {
            files.forEach(file => changes.push({ nodeKey: file.nodeKey, path: file.path, status: "unresolved" }));
            paths.forEach(filePath => changes.push({ path: filePath, status: "unresolved" }));
        }
        files.forEach(file => missing.splice(missing.indexOf(file), 1));
        paths.forEach(filePath => newPaths.splice(newPaths.indexOf(filePath), 1));
    });
}

function groupBy<T>(values: T[], key: (value: T) => string): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    values.forEach(value => {
        const groupKey = key(value);
        groups.set(groupKey, [...(groups.get(groupKey) || []), value]);
    });
    return groups;
}
