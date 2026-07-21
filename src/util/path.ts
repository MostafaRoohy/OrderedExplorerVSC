import * as path from 'node:path';
import * as vscode from 'vscode';

export function normalizeRelativePath(value: string): string {
    const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
    return normalized === '.' ? '' : normalized;
}

export function relativePath(folder: vscode.WorkspaceFolder, uri: vscode.Uri): string {
    if (folder.uri.scheme === 'file' && uri.scheme === 'file') {
        return normalizeRelativePath(path.relative(folder.uri.fsPath, uri.fsPath));
    }

    const base = folder.uri.path.endsWith('/') ? folder.uri.path : `${folder.uri.path}/`;
    if (!uri.path.startsWith(base) && uri.path !== folder.uri.path) {
        return '';
    }
    return normalizeRelativePath(uri.path.slice(base.length));
}

export function parentRelativePath(folder: vscode.WorkspaceFolder, uri: vscode.Uri): string {
    const current = relativePath(folder, uri);
    if (!current) {
        return '';
    }
    const index = current.lastIndexOf('/');
    return index < 0 ? '' : current.slice(0, index);
}

export function basename(uri: vscode.Uri): string {
    const value = uri.path.replace(/\/$/, '');
    const index = value.lastIndexOf('/');
    return decodeURIComponent(index < 0 ? value : value.slice(index + 1));
}

export function dirname(uri: vscode.Uri): vscode.Uri {
    const pathValue = uri.path.replace(/\/$/, '');
    const index = pathValue.lastIndexOf('/');
    const parentPath = index <= 0 ? '/' : pathValue.slice(0, index);
    return uri.with({ path: parentPath });
}

export function isEqualOrParent(parent: vscode.Uri, candidate: vscode.Uri): boolean {
    if (parent.scheme !== candidate.scheme || parent.authority !== candidate.authority) {
        return false;
    }

    const parentPath = parent.path.endsWith('/') ? parent.path : `${parent.path}/`;
    return candidate.path === parent.path || candidate.path.startsWith(parentPath);
}

export function joinRelative(parent: string, child: string): string {
    return normalizeRelativePath(parent ? `${parent}/${child}` : child);
}

export function quoteShellPath(value: string): string {
    return `'${value.replaceAll("'", "'\\''")}'`;
}
