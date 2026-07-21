import * as vscode from 'vscode';
import { CommandController } from './commands/controller';
import { OrderedExplorerDragAndDropController } from './explorer/dragDrop';
import { OrderedExplorerProvider } from './explorer/provider';
import { OrderConfigurationService } from './ordering/config';
import { ReorderService } from './ordering/reorder';
import { ExclusionService } from './services/exclusions';
import { FileOperationsService } from './services/fileOperations';
import { ExplorerWatcher } from './services/watcher';

export function activate(context: vscode.ExtensionContext): void {
    const orderConfiguration = new OrderConfigurationService();
    const exclusions = new ExclusionService();
    const provider = new OrderedExplorerProvider(orderConfiguration, exclusions);
    const fileOperations = new FileOperationsService(provider, orderConfiguration);
    const reorder = new ReorderService(provider, orderConfiguration);
    const dragAndDrop = new OrderedExplorerDragAndDropController(
        provider,
        fileOperations,
        reorder,
    );

    const treeView = vscode.window.createTreeView('orderedExplorer.files', {
        treeDataProvider: provider,
        canSelectMany: true,
        showCollapseAll: false,
        dragAndDropController: dragAndDrop,
    });
    treeView.description = 'workspace-defined order';

    const commands = new CommandController(
        treeView,
        provider,
        fileOperations,
        reorder,
        orderConfiguration,
    );
    const watcher = new ExplorerWatcher(provider);

    context.subscriptions.push(
        treeView,
        provider,
        commands,
        watcher,
        vscode.window.onDidChangeActiveTextEditor(() => {
            void commands.revealActiveFile(false);
        }),
        vscode.workspace.onDidRenameFiles(() => provider.refresh()),
        vscode.workspace.onDidCreateFiles(() => provider.refresh()),
        vscode.workspace.onDidDeleteFiles(() => provider.refresh()),
    );

    void commands.initialize();
    void commands.revealActiveFile(false);
}

export function deactivate(): void {
    // All resources are disposed through ExtensionContext subscriptions.
}
