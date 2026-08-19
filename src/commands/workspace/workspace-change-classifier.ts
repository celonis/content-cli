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

    expectedFiles.forEach(file =>
        classifyExpectedFile(file, visibleFiles, moveHints[file.nodeKey], changes, consumedPaths, missing)
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
    hint: string | undefined,
    changes: ClassifiedWorkspaceChange[],
    consumedPaths: Set<string>,
    missing: ExpectedWorkspaceFile[]
): void {
    if (!file.digest) {
        if (hint || visibleFiles.has(file.path)) {
            classifyNewFile(file, hint, visibleFiles, changes, consumedPaths);
        } else {
            missing.push(file);
        }
        return;
    }
    if (hint) {
        classifyHintedFile(file, hint, visibleFiles, changes, consumedPaths);
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
}

function classifyNewFile(
    file: ExpectedWorkspaceFile,
    hint: string | undefined,
    visibleFiles: Map<string, string>,
    changes: ClassifiedWorkspaceChange[],
    consumedPaths: Set<string>
): void {
    const target = hint || file.path;
    const sourceStillPresent = Boolean(hint && hint !== file.path && visibleFiles.has(file.path));
    if (sourceStillPresent || !visibleFiles.has(target) || consumedPaths.has(target)) {
        changes.push({ nodeKey: file.nodeKey, path: target, status: "unresolved" });
        if (visibleFiles.has(target)) {
            consumedPaths.add(target);
        }
        if (sourceStillPresent) {
            consumedPaths.add(file.path);
        }
        return;
    }
    consumedPaths.add(target);
    changes.push({ nodeKey: file.nodeKey, path: target, status: "added" });
}

function classifyHintedFile(
    file: ExpectedWorkspaceFile,
    hint: string,
    visibleFiles: Map<string, string>,
    changes: ClassifiedWorkspaceChange[],
    consumedPaths: Set<string>
): void {
    const sourceStillPresent = hint !== file.path && visibleFiles.has(file.path);
    if (sourceStillPresent || !visibleFiles.has(hint) || consumedPaths.has(hint)) {
        changes.push({ nodeKey: file.nodeKey, path: hint, status: "unresolved" });
        if (visibleFiles.has(hint)) {
            consumedPaths.add(hint);
        }
        if (sourceStillPresent) {
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
