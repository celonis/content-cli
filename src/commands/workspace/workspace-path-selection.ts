import * as fs from "node:fs";
import * as path from "node:path";
import { GracefulError } from "../../core/utils/logger";

export interface WorkspaceSelectionCandidate<T> {
    value: T;
    paths: string[];
}

interface Selection {
    path: string;
    directory: boolean;
}

export function selectWorkspaceCandidates<T>(
    root: string,
    values: string[],
    candidates: Array<WorkspaceSelectionCandidate<T>>
): T[] {
    if (values.length === 0) {
        return candidates.map(candidate => candidate.value);
    }
    const candidatePaths = candidates.flatMap(candidate => candidate.paths);
    const selections = values.map(value => selection(root, value, candidatePaths));
    return candidates
        .filter(candidate =>
            selections.some(selected => candidate.paths.some(candidatePath => matches(selected, candidatePath)))
        )
        .map(candidate => candidate.value);
}

function selection(root: string, value: string, candidatePaths: string[]): Selection {
    const absolute = path.resolve(process.cwd(), value);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    const folded = relative.toLowerCase();
    if (
        relative === ".." ||
        relative.startsWith("../") ||
        path.isAbsolute(relative) ||
        folded === ".package" ||
        folded.startsWith(".package/") ||
        folded === ".git" ||
        folded.startsWith(".git/")
    ) {
        throw new GracefulError(`Invalid workspace path: ${value}`);
    }
    const exists = fs.existsSync(absolute);
    if (exists && fs.lstatSync(absolute).isSymbolicLink()) {
        throw new GracefulError(`Workspace contains an unsupported symbolic link: ${value}`);
    }
    const directory = exists
        ? fs.lstatSync(absolute).isDirectory()
        : candidatePaths.some(candidate => candidate.toLowerCase().startsWith(`${folded}/`));
    return { path: relative, directory };
}

function matches(selection: Selection, candidatePath: string): boolean {
    const selected = selection.path.toLowerCase();
    const candidate = candidatePath.toLowerCase();
    return selection.directory
        ? !selected || candidate === selected || candidate.startsWith(`${selected}/`)
        : candidate === selected;
}
