import * as vscode from 'vscode';
import { OrderConfigurationService } from '../ordering/config';
import { applyAuthoritativeOrder } from '../ordering/sorter';
import { ExclusionService } from '../services/exclusions';
import { basename, dirname, isEqualOrParent, relativePath } from '../util/path';
import { ExplorerNode } from './node';

export class OrderedExplorerProvider implements vscode.TreeDataProvider<ExplorerNode> {
    private readonly changeEmitter = new vscode.EventEmitter<ExplorerNode | undefined | null>();
    private readonly nodeCache = new Map<string, ExplorerNode>();
    private readonly cutUris = new Set<string>();

    public readonly onDidChangeTreeData = this.changeEmitter.event;

    public constructor(
        private readonly orderConfiguration: OrderConfigurationService,
        private readonly exclusions: ExclusionService,
    ) {}

    public getTreeItem(node: ExplorerNode): vscode.TreeItem {
        const collapsibleState = node.isDirectory
            ? (node.isWorkspaceRoot
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.Collapsed)
            : vscode.TreeItemCollapsibleState.None;

        const item = node.isWorkspaceRoot
            ? new vscode.TreeItem(node.name, collapsibleState)
            : new vscode.TreeItem(node.uri, collapsibleState);
        item.id = node.id;
        item.resourceUri = node.uri;
        item.contextValue = node.contextValue;
        item.tooltip = this.createTooltip(node);
        item.accessibilityInformation = {
            label: `${node.isDirectory ? 'Folder' : 'File'} ${node.name}`,
            role: 'treeitem',
        };

        if (node.isWorkspaceRoot) {
            item.iconPath = new vscode.ThemeIcon('root-folder');
            item.command = {
                command: 'orderedExplorer.surfaceActivate',
                title: 'Create File or Folder',
                arguments: [node],
            };
        }

        if (!node.isDirectory) {
            item.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [node.uri],
            };
        }

        if (this.cutUris.has(node.uri.toString())) {
            item.description = 'cut';
        }

        return item;
    }

    public async getChildren(parent?: ExplorerNode): Promise<ExplorerNode[]> {
        if (!parent) {
            return this.getWorkspaceRoots();
        }

        if (!parent.isDirectory) {
            return [];
        }

        if (parent.isSymbolicLink && !this.orderConfiguration.get(parent.workspaceFolder).followSymlinks) {
            return [];
        }

        let entries: [string, vscode.FileType][];
        try {
            entries = await vscode.workspace.fs.readDirectory(parent.uri);
        } catch (error) {
            void vscode.window.showWarningMessage(
                `Ordered Explorer could not read ${parent.uri.toString()}: ${this.errorMessage(error)}`,
            );
            return [];
        }

        const config = this.orderConfiguration.get(parent.workspaceFolder);
        const nodes = await Promise.all(entries.map(async ([name, type]) => {
            const uri = vscode.Uri.joinPath(parent.uri, name);
            const childRelativePath = relativePath(parent.workspaceFolder, uri);
            const isDirectory = Boolean(type & vscode.FileType.Directory);

            if (!config.showExcludedFiles && this.exclusions.isExcluded(
                parent.workspaceFolder,
                childRelativePath,
                isDirectory,
            )) {
                return undefined;
            }

            let stat: vscode.FileStat | undefined;
            if (config.fallbackSort === 'modified' || Boolean(type & vscode.FileType.SymbolicLink)) {
                try {
                    stat = await vscode.workspace.fs.stat(uri);
                } catch {
                    stat = undefined;
                }
            }

            return this.cacheNode(new ExplorerNode(
                uri,
                stat?.type ?? type,
                parent.workspaceFolder,
                parent,
                false,
                stat,
            ));
        }));

        const visibleNodes = nodes.filter((node): node is ExplorerNode => Boolean(node));
        const order = this.orderConfiguration.getOrder(
            parent.workspaceFolder,
            parent.relativePath,
        );

        return applyAuthoritativeOrder(
            visibleNodes.map((node) => ({
                node,
                name: node.name,
                isDirectory: node.isDirectory,
                modifiedTime: node.stat?.mtime,
            })),
            order,
            config.fallbackSort,
        ).map((entry) => entry.node);
    }

    public getParent(node: ExplorerNode): ExplorerNode | undefined {
        return node.parent;
    }

    public refresh(node?: ExplorerNode): void {
        if (!node) {
            this.nodeCache.clear();
        }
        this.changeEmitter.fire(node);
    }

    public refreshUri(uri: vscode.Uri): void {
        const node = this.nodeCache.get(uri.toString());
        if (node) {
            this.refresh(node);
            return;
        }

        const parentNode = this.nodeCache.get(dirname(uri).toString());
        this.refresh(parentNode);
    }

    public setCutUris(uris: readonly vscode.Uri[]): void {
        this.cutUris.clear();
        for (const uri of uris) {
            this.cutUris.add(uri.toString());
        }
        this.refresh();
    }

    public clearCutUris(): void {
        if (this.cutUris.size) {
            this.cutUris.clear();
            this.refresh();
        }
    }

    public async resolveNode(uri: vscode.Uri): Promise<ExplorerNode | undefined> {
        const cached = this.nodeCache.get(uri.toString());
        if (cached) {
            return cached;
        }

        const folder = vscode.workspace.getWorkspaceFolder(uri);
        if (!folder) {
            return undefined;
        }

        return this.buildNodeChain(folder, uri);
    }

    public async getDirectoryChildren(node: ExplorerNode): Promise<ExplorerNode[]> {
        return this.getChildren(node);
    }

    public findNearestCachedParent(uri: vscode.Uri): ExplorerNode | undefined {
        let current = uri;
        while (isEqualOrParent(vscode.Uri.parse(`${uri.scheme}://${uri.authority}/`), current)) {
            const cached = this.nodeCache.get(current.toString());
            if (cached) {
                return cached;
            }
            const parent = dirname(current);
            if (parent.path === current.path) {
                break;
            }
            current = parent;
        }
        return undefined;
    }

    public dispose(): void {
        this.changeEmitter.dispose();
        this.nodeCache.clear();
    }

    private getWorkspaceRoots(): ExplorerNode[] {
        return (vscode.workspace.workspaceFolders ?? []).map((folder) => {
            const existing = this.nodeCache.get(folder.uri.toString());
            if (existing) {
                return existing;
            }
            return this.cacheNode(new ExplorerNode(
                folder.uri,
                vscode.FileType.Directory,
                folder,
                undefined,
                true,
            ));
        });
    }

    private async buildNodeChain(
        folder: vscode.WorkspaceFolder,
        uri: vscode.Uri,
    ): Promise<ExplorerNode | undefined> {
        const root = this.getWorkspaceRoots().find((node) => node.workspaceFolder.index === folder.index);
        if (!root) {
            return undefined;
        }

        if (uri.toString() === folder.uri.toString()) {
            return root;
        }

        const segments = relativePath(folder, uri).split('/').filter(Boolean);
        let parent = root;
        let currentUri = folder.uri;

        for (const segment of segments) {
            currentUri = vscode.Uri.joinPath(currentUri, segment);
            const key = currentUri.toString();
            const existing = this.nodeCache.get(key);
            if (existing) {
                parent = existing;
                continue;
            }

            let stat: vscode.FileStat;
            try {
                stat = await vscode.workspace.fs.stat(currentUri);
            } catch {
                return undefined;
            }

            parent = this.cacheNode(new ExplorerNode(
                currentUri,
                stat.type,
                folder,
                parent,
                false,
                stat,
            ));
        }

        return parent;
    }

    private cacheNode(node: ExplorerNode): ExplorerNode {
        this.nodeCache.set(node.uri.toString(), node);
        return node;
    }

    private createTooltip(node: ExplorerNode): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString(undefined, true);
        tooltip.appendCodeblock(node.uri.toString());
        if (node.isWorkspaceRoot) {
            tooltip.appendMarkdown('\nDouble-click the workspace root to create a file or folder.');
        }
        if (node.isSymbolicLink) {
            tooltip.appendMarkdown('\nSymbolic link');
        }
        return tooltip;
    }

    private errorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
}
