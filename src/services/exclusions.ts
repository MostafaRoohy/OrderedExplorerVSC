import { minimatch } from 'minimatch';
import * as vscode from 'vscode';
import { normalizeRelativePath } from '../util/path';

interface ExcludeWhen {
    readonly when?: string;
}

type ExcludeValue = boolean | ExcludeWhen;

export class ExclusionService {
    public isExcluded(
        folder: vscode.WorkspaceFolder,
        relativePath: string,
        isDirectory: boolean,
    ): boolean {
        const normalizedPath = normalizeRelativePath(relativePath);
        const configuration = vscode.workspace.getConfiguration('files', folder.uri);
        const excludes = configuration.get<Record<string, ExcludeValue>>('exclude', {});

        for (const [pattern, value] of Object.entries(excludes)) {
            if (value === false) {
                continue;
            }

            if (this.matches(normalizedPath, pattern, isDirectory)) {
                return true;
            }
        }

        return false;
    }

    private matches(relativePath: string, pattern: string, isDirectory: boolean): boolean {
        const normalizedPattern = normalizeRelativePath(pattern);
        const candidates = [
            relativePath,
            isDirectory ? `${relativePath}/` : relativePath,
        ];

        return candidates.some((candidate) => minimatch(candidate, normalizedPattern, {
            dot: true,
            nocase: process.platform === 'win32',
            matchBase: !normalizedPattern.includes('/'),
        }));
    }
}
