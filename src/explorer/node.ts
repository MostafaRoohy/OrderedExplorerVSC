import * as vscode from 'vscode';
import { basename, relativePath } from '../util/path';

export class ExplorerNode {
    public readonly id: string;
    public readonly name: string;
    public readonly relativePath: string;

    public constructor(
        public readonly uri: vscode.Uri,
        public readonly type: vscode.FileType,
        public readonly workspaceFolder: vscode.WorkspaceFolder,
        public readonly parent: ExplorerNode | undefined,
        public readonly isWorkspaceRoot: boolean = false,
        public readonly stat?: vscode.FileStat,
    ) {
        this.id = `${workspaceFolder.index}:${uri.toString()}`;
        this.name = isWorkspaceRoot ? workspaceFolder.name : basename(uri);
        this.relativePath = relativePath(workspaceFolder, uri);
    }

    public get isDirectory(): boolean {
        return this.isWorkspaceRoot || Boolean(this.type & vscode.FileType.Directory);
    }

    public get isFile(): boolean {
        return Boolean(this.type & vscode.FileType.File);
    }

    public get isSymbolicLink(): boolean {
        return Boolean(this.type & vscode.FileType.SymbolicLink);
    }

    public get contextValue(): string {
        if (this.isWorkspaceRoot) {
            return 'orderedExplorer.root';
        }
        if (this.isDirectory) {
            return 'orderedExplorer.folder';
        }
        return 'orderedExplorer.file';
    }
}
