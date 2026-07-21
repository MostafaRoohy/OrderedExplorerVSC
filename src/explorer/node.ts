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
        public readonly isCreationSurface: boolean = false,
    ) {
        this.id = isCreationSurface
            ? `${workspaceFolder.index}:${parent?.id ?? uri.toString()}:creation-surface`
            : `${workspaceFolder.index}:${uri.toString()}`;
        this.name = isCreationSurface
            ? 'Double-click to create a file or folder'
            : (isWorkspaceRoot ? workspaceFolder.name : basename(uri));
        this.relativePath = isCreationSurface
            ? (parent?.relativePath ?? '')
            : relativePath(workspaceFolder, uri);
    }

    public get isDirectory(): boolean {
        return !this.isCreationSurface
            && (this.isWorkspaceRoot || Boolean(this.type & vscode.FileType.Directory));
    }

    public get isFile(): boolean {
        return !this.isCreationSurface && Boolean(this.type & vscode.FileType.File);
    }

    public get isSymbolicLink(): boolean {
        return !this.isCreationSurface && Boolean(this.type & vscode.FileType.SymbolicLink);
    }

    public get contextValue(): string {
        if (this.isCreationSurface) {
            return 'orderedExplorer.creationSurface';
        }
        if (this.isWorkspaceRoot) {
            return 'orderedExplorer.root';
        }
        if (this.isDirectory) {
            return 'orderedExplorer.folder';
        }
        return 'orderedExplorer.file';
    }
}
