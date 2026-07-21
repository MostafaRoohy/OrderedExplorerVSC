import * as vscode from 'vscode';
import { ExplorerNode } from '../explorer/node';
import { OrderedExplorerProvider } from '../explorer/provider';
import { OrderConfigurationService } from '../ordering/config';
import { ReorderService } from '../ordering/reorder';
import { AiCopyService } from '../services/aiCopy';
import { FileOperationsService } from '../services/fileOperations';
import { mayRevealTree } from '../services/revealPolicy';

const MENU_EMOJI_ALIASES: Readonly<Record<string, string>> = {
    'orderedExplorer.menuEmoji.openToSide':            'orderedExplorer.openToSide',
    'orderedExplorer.menuEmoji.newFile':               'orderedExplorer.newFile',
    'orderedExplorer.menuEmoji.newFolder':             'orderedExplorer.newFolder',
    'orderedExplorer.menuEmoji.rename':                'orderedExplorer.rename',
    'orderedExplorer.menuEmoji.delete':                'orderedExplorer.delete',
    'orderedExplorer.menuEmoji.deletePermanently':     'orderedExplorer.deletePermanently',
    'orderedExplorer.menuEmoji.duplicate':             'orderedExplorer.duplicate',
    'orderedExplorer.menuEmoji.move':                  'orderedExplorer.move',
    'orderedExplorer.menuEmoji.copy':                  'orderedExplorer.copy',
    'orderedExplorer.menuEmoji.cut':                   'orderedExplorer.cut',
    'orderedExplorer.menuEmoji.paste':                 'orderedExplorer.paste',
    'orderedExplorer.menuEmoji.copyForAI':             'orderedExplorer.copyForAI',
    'orderedExplorer.menuEmoji.copyProjectStructure':  'orderedExplorer.copyProjectStructure',
    'orderedExplorer.menuEmoji.copyPath':              'orderedExplorer.copyPath',
    'orderedExplorer.menuEmoji.copyRelativePath':      'orderedExplorer.copyRelativePath',
    'orderedExplorer.menuEmoji.revealInOS':            'orderedExplorer.revealInOS',
    'orderedExplorer.menuEmoji.openTerminal':          'orderedExplorer.openTerminal',
    'orderedExplorer.menuEmoji.compareSelected':       'orderedExplorer.compareSelected',
    'orderedExplorer.menuEmoji.moveUp':                'orderedExplorer.moveUp',
    'orderedExplorer.menuEmoji.moveDown':              'orderedExplorer.moveDown',
    'orderedExplorer.menuEmoji.moveToTop':             'orderedExplorer.moveToTop',
    'orderedExplorer.menuEmoji.moveToBottom':          'orderedExplorer.moveToBottom',
    'orderedExplorer.menuEmoji.placeBefore':           'orderedExplorer.placeBefore',
    'orderedExplorer.menuEmoji.placeAfter':            'orderedExplorer.placeAfter',
    'orderedExplorer.menuEmoji.removeCustomPosition':  'orderedExplorer.removeCustomPosition',};

export class CommandController implements vscode.Disposable {
    private readonly disposables: vscode.Disposable[] = [];
    private isCollapsingAll = false;

    public constructor(
        private readonly treeView: vscode.TreeView<ExplorerNode>,
        private readonly provider: OrderedExplorerProvider,
        private readonly fileOperations: FileOperationsService,
        private readonly reorder: ReorderService,
        private readonly configuration: OrderConfigurationService,
        private readonly aiCopy: AiCopyService,
    ) {
        this.register('orderedExplorer.refresh', () => this.provider.refresh());
        this.register('orderedExplorer.collapseAll', () => this.collapseAll());
        this.register('orderedExplorer.revealActiveFile', () => this.revealActiveFile(true, true));
        this.register('orderedExplorer.toggleExcluded', () => this.toggleExcluded());
        this.register('orderedExplorer.open', (item, selected) =>
            this.fileOperations.open(this.resolveNodes(item, selected)));
        this.register('orderedExplorer.openToSide', (item, selected) =>
            this.fileOperations.open(this.resolveNodes(item, selected), true));
        this.register('orderedExplorer.newFile', (item) => this.fileOperations.createFile(
            this.resolvePrimary(item),
        ));
        this.register('orderedExplorer.newFolder', (item) => this.fileOperations.createFolder(
            this.resolvePrimary(item),
        ));
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
        this.register('orderedExplorer.copyForAI', (item, selected) =>
            this.aiCopy.copyToClipboard(this.resolveNodes(item, selected)));
        this.register('orderedExplorer.copyProjectStructure', (item, selected) =>
            this.aiCopy.copyProjectStructure(this.resolveNodes(item, selected)));
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
        this.register('orderedExplorer.openWorkspaceFile', async () => {
            if (vscode.workspace.workspaceFile) {
                await vscode.commands.executeCommand('vscode.open', vscode.workspace.workspaceFile);
            } else {
                void vscode.window.showInformationMessage(
                    'This window does not use a saved .code-workspace file.',
                );
            }
        });

        for (const [alias, target] of Object.entries(MENU_EMOJI_ALIASES)) {
            this.registerAlias(alias, target);
        }

        this.disposables.push(
            this.treeView.onDidCollapseElement(({ element }) => {
                if (element.isWorkspaceRoot && !this.isCollapsingAll) {
                    void this.keepRootExpanded(element);
                }
            }),
        );
    }

    public async initialize(): Promise<void> {
        const roots = await this.provider.getChildren();
        for (const root of roots) {
            await this.keepRootExpanded(root);
        }
    }

    public async revealActiveFile(
        select: boolean = false,
        allowViewActivation: boolean = false,
    ): Promise<void> {
        if (!mayRevealTree(this.treeView.visible, allowViewActivation)) {
            return;
        }

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

    private registerAlias(alias: string, target: string): void {
        this.register(alias, (item, selected) => vscode.commands.executeCommand(
            target,
            item,
            selected,
        ));
    }

    private resolveNodes(
        item?: ExplorerNode,
        selected?: readonly ExplorerNode[],
    ): ExplorerNode[] {
        const selection = selected?.length ? [...selected] : [...this.treeView.selection];
        const resolved = item && !selection.some((node) => node.id === item.id)
            ? [item]
            : (selection.length ? selection : (item ? [item] : []));

        return resolved;
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

        const roots = await this.provider.getChildren();
        for (const root of roots) {
            await this.keepRootExpanded(root);
        }
    }

    private async keepRootExpanded(root: ExplorerNode): Promise<void> {
        if (!this.treeView.visible || !root.isWorkspaceRoot) {
            return;
        }

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
