import * as vscode from 'vscode';
import { ReorderService } from '../ordering/reorder';
import { FileOperationsService } from '../services/fileOperations';
import { ExplorerNode } from './node';
import { OrderedExplorerProvider } from './provider';

const TREE_MIME = 'application/vnd.code.tree.orderedexplorer.files';

export class OrderedExplorerDragAndDropController
implements vscode.TreeDragAndDropController<ExplorerNode> {
    public readonly dropMimeTypes = [TREE_MIME, 'text/uri-list', 'files'];
    public readonly dragMimeTypes = ['text/uri-list'];

    public constructor(
        private readonly provider: OrderedExplorerProvider,
        private readonly fileOperations: FileOperationsService,
        private readonly reorder: ReorderService,
    ) {}

    public handleDrag(
        source: readonly ExplorerNode[],
        dataTransfer: vscode.DataTransfer,
    ): void {
        const movable = source.filter((node) => !node.isWorkspaceRoot);
        const uriStrings = movable.map((node) => node.uri.toString());
        dataTransfer.set(TREE_MIME, new vscode.DataTransferItem(uriStrings));
        dataTransfer.set(
            'text/uri-list',
            new vscode.DataTransferItem(uriStrings.join('\r\n')),
        );
    }

    public async handleDrop(
        target: ExplorerNode | undefined,
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken,
    ): Promise<void> {
        if (token.isCancellationRequested) {
            return;
        }

        const sourceNodes = await this.readSourceNodes(dataTransfer);
        if (!sourceNodes.length) {
            await this.copyExternalFiles(target, dataTransfer);
            return;
        }

        if (target && !target.isDirectory) {
            const sameParent = sourceNodes.every((node) => node.parent?.id === target.parent?.id);
            if (sameParent) {
                await this.reorder.placeBeforeTarget(sourceNodes, target);
                return;
            }

            if (target.parent) {
                await this.fileOperations.moveToDirectory(sourceNodes, target.parent.uri);
                const movedNodes = (await Promise.all(sourceNodes.map((node) =>
                    this.provider.resolveNode(vscode.Uri.joinPath(target.parent!.uri, node.name)),
                ))).filter((node): node is ExplorerNode => Boolean(node));
                await this.reorder.placeBeforeTarget(movedNodes, target);
            }
            return;
        }

        const destination = target?.uri ?? vscode.workspace.workspaceFolders?.[0]?.uri;
        if (destination) {
            await this.fileOperations.moveToDirectory(sourceNodes, destination);
        }
    }

    private async readSourceNodes(
        dataTransfer: vscode.DataTransfer,
    ): Promise<ExplorerNode[]> {
        const custom = dataTransfer.get(TREE_MIME);
        let uriStrings: string[] = [];

        if (custom) {
            if (Array.isArray(custom.value)) {
                uriStrings = custom.value.filter((value): value is string => typeof value === 'string');
            } else {
                try {
                    const parsed: unknown = JSON.parse(await custom.asString());
                    if (Array.isArray(parsed)) {
                        uriStrings = parsed.filter((value): value is string => typeof value === 'string');
                    }
                } catch {
                    uriStrings = [];
                }
            }
        }

        if (!uriStrings.length) {
            const uriList = dataTransfer.get('text/uri-list');
            if (uriList) {
                uriStrings = (await uriList.asString())
                    .split(/\r?\n/)
                    .map((value) => value.trim())
                    .filter((value) => value && !value.startsWith('#'));
            }
        }

        const nodes = await Promise.all(uriStrings.map(async (value) => {
            try {
                return await this.provider.resolveNode(vscode.Uri.parse(value));
            } catch {
                return undefined;
            }
        }));
        return nodes.filter((node): node is ExplorerNode => Boolean(node));
    }

    private async copyExternalFiles(
        target: ExplorerNode | undefined,
        dataTransfer: vscode.DataTransfer,
    ): Promise<void> {
        const destination = target?.isDirectory
            ? target
            : target?.parent;
        if (!destination) {
            return;
        }

        for (const [, item] of dataTransfer) {
            const file = item.asFile();
            if (!file) {
                continue;
            }
            const uri = vscode.Uri.joinPath(destination.uri, file.name);
            await vscode.workspace.fs.writeFile(uri, await file.data());
        }
        this.provider.refresh(destination);
    }
}
