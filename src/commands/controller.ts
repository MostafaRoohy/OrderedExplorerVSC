import * as vscode from 'vscode';
import { ExplorerNode } from '../explorer/node';
import { OrderedExplorerProvider } from '../explorer/provider';
import { OrderConfigurationService } from '../ordering/config';
import { ReorderService } from '../ordering/reorder';
import { FileOperationsService } from '../services/fileOperations';

const SURFACE_DOUBLE_CLICK_MS = 500;

export class CommandController implements vscode.Disposable {
    private readonly disposables: vscode.Disposable[] = [];
    private readonly expandedDirectoryIds = new Set<string>();
    private lastSurfaceActivation: { id: string; at: number } | undefined;
    private isCollapsingAll = false;

    public constructor(
        private readonly treeView: vscode.TreeView<ExplorerNode>,
        private readonly provider: OrderedExplorerProvider,
        private readonly fileOperations: FileOperationsService,
        private readonly reorder: ReorderService,
        private readonly configuration: OrderConfigurationService,
    ) {
        this.register('orderedExplorer.refresh', () => this.provider.refresh());
        this.register('orderedExplorer.collapseAll', () => this.collapseAll());
        this.register('orderedExplorer.expandAll', () => this.expandAll());
        this.register('orderedExplorer.surfaceActivate', (item) =>
            this.handleSurfaceActivation(item));
        this.register('orderedExplorer.revealActiveFile', () => this.revealActiveFile(true));
        this.register('orderedExplorer.toggleExcluded', () => this.toggleExcluded());
        this.register('orderedExplorer.open', (item, selected) =>
            this.fileOperations.open(this.resolveNodes(item, selected)));
        this.register('orderedExplorer.openToSide', (item, selected) =>
            this.fileOperations.open(this.resolveNodes(item, selected), true));
        this.register('orderedExplorer.newFile', (item) => this.fileOperations.createFile(item));
        this.register('orderedExplorer.newFolder', (item) => this.fileOperations.createFolder(item));
        this.register('orderedExplorer.rename', (item) =>
            this.fileOperations.rename(this.resolvePrimary(item)));
        this.register('orderedExplorer.delete', (item, selected) =>
            this.fileOperations.delete(this.resolveNodes(item, selected), false));
        this.register('orderedExplorer.deletePermanently', (item, selected) =>
            this.fileOperations.delete(this.resolveNodes(item, selected), true));
        this.register('orderedExplorer.duplicate', (item, selected) =>
            this.fileOperations.duplicate(this.resolveNodes(item, selected)));
        this.register('orderedExplorer.move', (item, selected) =>
            this.fileOperations.move(this.resolveNodes(item, selected)));
        this.register('orderedExplorer.copy', (item, selected) =>
            this.fileOperations.copy(this.resolveNodes(item, selected), false));
        this.register('orderedExplorer.cut', (item, selected) =>
            this.fileOperations.copy(this.resolveNodes(item, selected), true));
        this.register('orderedExplorer.paste', (item) =>
            this.fileOperations.paste(this.resolvePrimary(item)));
        this.register('orderedExplorer.copyPath', (item, selected) =>
            this.fileOperations.copyPath(this.resolveNodes(item, selected), false));
        this.register('orderedExplorer.copyRelativePath', (item, selected) =>
            this.fileOperations.copyPath(this.resolveNodes(item, selected), true));
        this.register('orderedExplorer.revealInOS', (item) =>
            this.fileOperations.revealInOS(this.resolvePrimary(item)));
        this.register('orderedExplorer.openTerminal', (item) =>
            this.fileOperations.openTerminal(this.resolvePrimary(item)));
        this.register('orderedExplorer.compareSelected', (item, selected) =>
            this.fileOperations.compare(this.resolveNodes(item, selected)));
        this.register('orderedExplorer.moveUp', (item, selected) =>
            this.reorder.moveUp(this.resolveNodes(item, selected)));
        this.register('orderedExplorer.moveDown', (item, selected) =>
            this.reorder.moveDown(this.resolveNodes(item, selected)));
        this.register('orderedExplorer.moveToTop', (item, selected) =>
            this.reorder.moveToTop(this.resolveNodes(item, selected)));
        this.register('orderedExplorer.moveToBottom', (item, selected) =>
            this.reorder.moveToBottom(this.resolveNodes(item, selected)));
        this.register('orderedExplorer.placeBefore', (item, selected) =>
            this.reorder.placeBefore(this.resolveNodes(item, selected)));
        this.register('orderedExplorer.placeAfter', (item, selected) =>
            this.reorder.placeAfter(this.resolveNodes(item, selected)));
        this.register('orderedExplorer.removeCustomPosition', (item, selected) =>
            this.reorder.removeCustomPosition(this.resolveNodes(item, selected)));
        this.register('orderedExplorer.captureCurrentOrder', (item) =>
            this.reorder.captureCurrentOrder(this.resolvePrimary(item)));
        this.register('orderedExplorer.resetDirectoryOrder', (item) =>
            this.reorder.resetDirectoryOrder(this.resolvePrimary(item)));
        this.register('orderedExplorer.cleanStaleOrder', (item) =>
            this.reorder.cleanStale(this.resolvePrimary(item)));
        this.register('orderedExplorer.openWorkspaceFile', async () => {
            if (vscode.workspace.workspaceFile) {
                await vscode.commands.executeCommand('vscode.open', vscode.workspace.workspaceFile);
            } else {
                void vscode.window.showInformationMessage(
                    'This window does not use a saved .code-workspace file.',
                );
            }
        });

        this.disposables.push(
            this.treeView.onDidExpandElement(({ element }) => {
                if (!element.isWorkspaceRoot) {
                    this.expandedDirectoryIds.add(element.id);
                    void this.updateCollapseContext();
                }
            }),
            this.treeView.onDidCollapseElement(({ element }) => {
                if (element.isWorkspaceRoot) {
                    if (!this.isCollapsingAll) {
                        void this.keepRootExpanded(element);
                    }
                    return;
                }
                this.expandedDirectoryIds.delete(element.id);
                void this.updateCollapseContext();
            }),
        );
    }

    public async initialize(): Promise<void> {
        await vscode.commands.executeCommand(
            'setContext',
            'orderedExplorer.allCollapsed',
            false,
        );
    }

    public async revealActiveFile(select: boolean = false): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
        if (!folder || !this.configuration.get(folder).autoReveal) {
            return;
        }
        const node = await this.provider.resolveNode(editor.document.uri);
        if (!node) {
            return;
        }
        try {
            await this.treeView.reveal(node, {
                select,
                focus: false,
                expand: true,
            });
        } catch {
            // The resource may have disappeared between editor and tree resolution.
        }
    }

    public dispose(): void {
        this.disposables.splice(0).forEach((disposable) => disposable.dispose());
    }

    private register(
        command: string,
        handler: (item?: ExplorerNode, selected?: readonly ExplorerNode[]) => unknown,
    ): void {
        this.disposables.push(vscode.commands.registerCommand(
            command,
            async (item?: ExplorerNode, selected?: readonly ExplorerNode[]) => {
                try {
                    await handler(item, selected);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    void vscode.window.showErrorMessage(`${command}: ${message}`);
                }
            },
        ));
    }

    private resolveNodes(
        item?: ExplorerNode,
        selected?: readonly ExplorerNode[],
    ): ExplorerNode[] {
        const selection = selected?.length ? [...selected] : [...this.treeView.selection];
        if (item && !selection.some((node) => node.id === item.id)) {
            return [item];
        }
        if (selection.length) {
            return selection;
        }
        return item ? [item] : [];
    }

    private resolvePrimary(item?: ExplorerNode): ExplorerNode | undefined {
        return item ?? this.treeView.selection[0];
    }

    private async collapseAll(): Promise<void> {
        this.isCollapsingAll = true;
        try {
            await vscode.commands.executeCommand(
                'workbench.actions.treeView.orderedExplorer.files.collapseAll',
            );
        } finally {
            this.isCollapsingAll = false;
        }

        this.expandedDirectoryIds.clear();
        const roots = await this.provider.getChildren();
        for (const root of roots) {
            await this.keepRootExpanded(root);
        }
        await this.updateCollapseContext();
    }

    private async expandAll(): Promise<void> {
        this.expandedDirectoryIds.clear();

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Expanding Ordered Explorer',
                cancellable: true,
            },
            async (progress, token) => {
                const queue = [...await this.provider.getChildren()];
                let visited = 0;

                while (queue.length && !token.isCancellationRequested) {
                    const directory = queue.shift();
                    if (!directory) {
                        continue;
                    }

                    await this.treeView.reveal(directory, {
                        select: false,
                        focus: false,
                        expand: true,
                    });
                    if (!directory.isWorkspaceRoot) {
                        this.expandedDirectoryIds.add(directory.id);
                    }

                    const children = await this.provider.getDirectoryChildren(directory);
                    queue.push(...children.filter((child) => child.isDirectory));

                    visited += 1;
                    if (visited % 25 === 0) {
                        progress.report({ message: `${visited} folders expanded` });
                    }
                }
            },
        );

        await this.updateCollapseContext();
    }

    private async keepRootExpanded(root: ExplorerNode): Promise<void> {
        try {
            await this.treeView.reveal(root, {
                select: false,
                focus: false,
                expand: true,
            });
        } catch {
            // The workspace root may have been removed while the command was running.
        }
    }

    private async updateCollapseContext(): Promise<void> {
        await vscode.commands.executeCommand(
            'setContext',
            'orderedExplorer.allCollapsed',
            this.expandedDirectoryIds.size === 0,
        );
    }

    private async handleSurfaceActivation(item?: ExplorerNode): Promise<void> {
        if (!item?.isWorkspaceRoot) {
            return;
        }

        const now = Date.now();
        const previous = this.lastSurfaceActivation;
        this.lastSurfaceActivation = { id: item.id, at: now };

        if (
            !previous
            || previous.id !== item.id
            || now - previous.at > SURFACE_DOUBLE_CLICK_MS
        ) {
            return;
        }

        this.lastSurfaceActivation = undefined;
        await this.fileOperations.createFile(item);
    }

    private async toggleExcluded(): Promise<void> {
        const folder = this.treeView.selection[0]?.workspaceFolder
            ?? vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
            return;
        }
        const current = this.configuration.get(folder).showExcludedFiles;
        await vscode.workspace.getConfiguration('orderedExplorer', folder.uri).update(
            'showExcludedFiles',
            !current,
            vscode.ConfigurationTarget.Workspace,
        );
        this.provider.refresh();
    }
}
