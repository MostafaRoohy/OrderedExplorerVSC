import * as path from 'node:path';
import * as vscode from 'vscode';
import { OrderConfigurationService } from '../ordering/config';
import type { ClipboardState } from '../types';
import {
    basename,
    dirname,
    isEqualOrParent,
    parentRelativePath,
    quoteShellPath,
    relativePath,
} from '../util/path';
import { ExplorerNode } from '../explorer/node';
import { OrderedExplorerProvider } from '../explorer/provider';
import { parseResourceCreationInput } from './resourceInput';

export class FileOperationsService {
    private clipboard: ClipboardState | undefined;

    public constructor(
        private readonly provider: OrderedExplorerProvider,
        private readonly orderConfiguration: OrderConfigurationService,
    ) {}

    public async open(nodes: readonly ExplorerNode[], beside: boolean = false): Promise<void> {
        for (const node of nodes) {
            if (node.isDirectory) {
                continue;
            }
            await vscode.commands.executeCommand(
                'vscode.open',
                node.uri,
                beside ? { viewColumn: vscode.ViewColumn.Beside } : undefined,
            );
        }
    }

    public async createFile(target?: ExplorerNode): Promise<void> {
        const directory = this.resolveTargetDirectory(target);
        if (!directory) {
            void vscode.window.showInformationMessage('Open a workspace folder first.');
            return;
        }

        const name = await vscode.window.showInputBox({
            title: 'New File or Folder',
            prompt: `Create inside ${directory.name}. End the name with / to create a folder.`,
            placeHolder: 'path/to/file.py or path/to/folder/',
            validateInput: this.validateRelativeInput,
        });
        if (!name) {
            return;
        }

        const input = parseResourceCreationInput(name);
        const uri = this.joinUserPath(directory.uri, input.relativePath);
        if (await this.exists(uri)) {
            void vscode.window.showErrorMessage(
                `A resource named “${input.relativePath}” already exists.`,
            );
            return;
        }

        if (input.kind === 'directory') {
            await vscode.workspace.fs.createDirectory(uri);
            this.provider.refresh(directory);
            return;
        }

        await this.ensureParentDirectory(uri);
        await vscode.workspace.fs.writeFile(uri, new Uint8Array());
        this.provider.refresh(directory);
        await vscode.commands.executeCommand('vscode.open', uri);
    }

    public async createFolder(target?: ExplorerNode): Promise<void> {
        const directory = this.resolveTargetDirectory(target);
        if (!directory) {
            void vscode.window.showInformationMessage('Open a workspace folder first.');
            return;
        }

        const name = await vscode.window.showInputBox({
            title: 'New Folder',
            prompt: `Create a folder inside ${directory.name}`,
            placeHolder: 'path/to/folder',
            validateInput: this.validateRelativeInput,
        });
        if (!name) {
            return;
        }

        const uri = this.joinUserPath(directory.uri, name);
        if (await this.exists(uri)) {
            void vscode.window.showErrorMessage(`A resource named “${name}” already exists.`);
            return;
        }

        await vscode.workspace.fs.createDirectory(uri);
        this.provider.refresh(directory);
    }

    public async rename(node: ExplorerNode | undefined): Promise<void> {
        if (!node || node.isWorkspaceRoot) {
            return;
        }

        const newName = await vscode.window.showInputBox({
            title: 'Rename',
            value: node.name,
            valueSelection: this.fileNameSelection(node.name, node.isDirectory),
            validateInput: (value) => this.validateSingleName(value, node.name),
        });
        if (!newName || newName === node.name) {
            return;
        }

        const destination = vscode.Uri.joinPath(dirname(node.uri), newName);
        if (await this.exists(destination)) {
            void vscode.window.showErrorMessage(`A resource named “${newName}” already exists.`);
            return;
        }

        const oldRelative = node.relativePath;
        const newRelative = relativePath(node.workspaceFolder, destination);
        await vscode.workspace.fs.rename(node.uri, destination, { overwrite: false });
        await this.orderConfiguration.renameEntry(
            node.workspaceFolder,
            parentRelativePath(node.workspaceFolder, node.uri),
            node.name,
            newName,
            oldRelative,
            newRelative,
            node.isDirectory,
        );
        this.provider.refresh(node.parent);
    }

    public async delete(
        nodes: readonly ExplorerNode[],
        permanently: boolean = false,
    ): Promise<void> {
        const deletable = nodes.filter((node) => !node.isWorkspaceRoot);
        if (!deletable.length) {
            return;
        }

        const configuration = this.orderConfiguration.get(deletable[0]!.workspaceFolder);
        const names = deletable.slice(0, 5).map((node) => node.name).join(', ');
        const suffix = deletable.length > 5 ? ` and ${deletable.length - 5} more` : '';
        const actionLabel = permanently ? 'Delete Permanently' : 'Move to Trash';

        if (configuration.confirmDelete) {
            const message = permanently
                ? `Permanently delete ${names}${suffix}? This action cannot be undone.`
                : `Move ${names}${suffix} to Trash?`;
            const confirmation = await vscode.window.showWarningMessage(
                message,
                { modal: true },
                actionLabel,
            );
            if (confirmation !== actionLabel) {
                return;
            }
        }

        for (const node of deletable) {
            if (permanently) {
                await vscode.workspace.fs.delete(node.uri, {
                    recursive: node.isDirectory,
                    useTrash: false,
                });
            } else {
                try {
                    await vscode.workspace.fs.delete(node.uri, {
                        recursive: node.isDirectory,
                        useTrash: true,
                    });
                } catch (error) {
                    const fallback = await vscode.window.showWarningMessage(
                        `Trash is unavailable for “${node.name}”. Delete it permanently instead?`,
                        {
                            modal: true,
                            detail: error instanceof Error ? error.message : String(error),
                        },
                        'Delete Permanently',
                    );
                    if (fallback !== 'Delete Permanently') {
                        continue;
                    }
                    await vscode.workspace.fs.delete(node.uri, {
                        recursive: node.isDirectory,
                        useTrash: false,
                    });
                }
            }

            await this.orderConfiguration.deleteEntry(
                node.workspaceFolder,
                parentRelativePath(node.workspaceFolder, node.uri),
                node.name,
                node.relativePath,
                node.isDirectory,
            );
        }

        this.provider.refresh();
    }

    public async duplicate(nodes: readonly ExplorerNode[]): Promise<void> {
        for (const node of nodes.filter((item) => !item.isWorkspaceRoot)) {
            const destination = await this.uniqueCopyUri(node);
            await vscode.workspace.fs.copy(node.uri, destination, { overwrite: false });

            const destinationFolder = vscode.workspace.getWorkspaceFolder(destination);
            if (destinationFolder) {
                const destinationParent = parentRelativePath(destinationFolder, destination);
                const order = this.orderConfiguration.getOrder(destinationFolder, destinationParent);
                const originalIndex = order.indexOf(node.name);
                const copiedName = basename(destination);
                const nextOrder = [...order.filter((item) => item !== copiedName)];
                if (originalIndex >= 0) {
                    nextOrder.splice(originalIndex + 1, 0, copiedName);
                } else {
                    const wildcard = nextOrder.indexOf('*');
                    nextOrder.splice(wildcard >= 0 ? wildcard : nextOrder.length, 0, copiedName);
                }
                await this.orderConfiguration.updateOrder(
                    destinationFolder,
                    destinationParent,
                    nextOrder,
                );
            }
        }

        this.provider.refresh();
    }

    public async move(nodes: readonly ExplorerNode[]): Promise<void> {
        const movable = nodes.filter((node) => !node.isWorkspaceRoot);
        if (!movable.length) {
            return;
        }

        const defaultUri = movable[0]!.parent?.uri ?? movable[0]!.workspaceFolder.uri;
        const selected = await vscode.window.showOpenDialog({
            title: 'Move To Folder',
            defaultUri,
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Move Here',
        });
        const destination = selected?.[0];
        if (!destination) {
            return;
        }

        await this.moveToDirectory(movable, destination);
    }

    public copy(nodes: readonly ExplorerNode[], cut: boolean): void {
        const resources = nodes
            .filter((node) => !node.isWorkspaceRoot)
            .map((node) => node.uri);
        if (!resources.length) {
            return;
        }

        this.clipboard = { uris: resources, cut };
        void vscode.env.clipboard.writeText(resources.map((uri) => uri.fsPath || uri.toString()).join('\n'));
        if (cut) {
            this.provider.setCutUris(resources);
        } else {
            this.provider.clearCutUris();
        }
    }

    public async paste(target?: ExplorerNode): Promise<void> {
        if (!this.clipboard) {
            void vscode.window.showInformationMessage('Ordered Explorer clipboard is empty.');
            return;
        }

        const directory = this.resolveTargetDirectory(target);
        if (!directory) {
            return;
        }

        const nodes = (await Promise.all(
            this.clipboard.uris.map((uri) => this.provider.resolveNode(uri)),
        )).filter((node): node is ExplorerNode => Boolean(node));

        if (this.clipboard.cut) {
            await this.moveToDirectory(nodes, directory.uri);
            this.clipboard = undefined;
            this.provider.clearCutUris();
            return;
        }

        for (const node of nodes) {
            let destination = vscode.Uri.joinPath(directory.uri, node.name);
            if (await this.exists(destination)) {
                const action = await vscode.window.showWarningMessage(
                    `“${node.name}” already exists in ${directory.name}.`,
                    { modal: true },
                    'Replace',
                    'Keep Both',
                    'Skip',
                );
                if (!action || action === 'Skip') {
                    continue;
                }
                if (action === 'Keep Both') {
                    destination = await this.uniqueCopyUri(node, directory.uri);
                }
                await vscode.workspace.fs.copy(node.uri, destination, {
                    overwrite: action === 'Replace',
                });
            } else {
                await vscode.workspace.fs.copy(node.uri, destination, { overwrite: false });
            }
        }

        this.provider.refresh(directory);
    }

    public async moveToDirectory(
        nodes: readonly ExplorerNode[],
        destinationDirectory: vscode.Uri,
    ): Promise<void> {
        for (const node of nodes) {
            if (isEqualOrParent(node.uri, destinationDirectory)) {
                void vscode.window.showErrorMessage(
                    `Cannot move “${node.name}” into itself or one of its descendants.`,
                );
                continue;
            }

            const destination = vscode.Uri.joinPath(destinationDirectory, node.name);
            if (destination.toString() === node.uri.toString()) {
                continue;
            }

            let overwrite = false;
            if (await this.exists(destination)) {
                const action = await vscode.window.showWarningMessage(
                    `“${node.name}” already exists in the destination.`,
                    { modal: true },
                    'Replace',
                    'Skip',
                );
                if (action !== 'Replace') {
                    continue;
                }
                overwrite = true;
            }

            const sourceFolder = node.workspaceFolder;
            const destinationFolder = vscode.workspace.getWorkspaceFolder(destination);
            const sourceParent = parentRelativePath(sourceFolder, node.uri);
            const sourceRelative = node.relativePath;

            try {
                await vscode.workspace.fs.rename(node.uri, destination, { overwrite });
            } catch {
                await vscode.workspace.fs.copy(node.uri, destination, { overwrite });
                await vscode.workspace.fs.delete(node.uri, { recursive: node.isDirectory });
            }

            if (destinationFolder && destinationFolder.index === sourceFolder.index) {
                await this.orderConfiguration.moveEntry(
                    sourceFolder,
                    sourceParent,
                    parentRelativePath(destinationFolder, destination),
                    node.name,
                    sourceRelative,
                    relativePath(destinationFolder, destination),
                    node.isDirectory,
                );
            } else {
                await this.orderConfiguration.deleteEntry(
                    sourceFolder,
                    sourceParent,
                    node.name,
                    sourceRelative,
                    node.isDirectory,
                );
                if (destinationFolder) {
                    const destinationParent = parentRelativePath(destinationFolder, destination);
                    const order = this.orderConfiguration.getOrder(destinationFolder, destinationParent);
                    const wildcard = order.indexOf('*');
                    const next = [...order.filter((item) => item !== node.name)];
                    next.splice(wildcard >= 0 ? wildcard : next.length, 0, node.name);
                    await this.orderConfiguration.updateOrder(destinationFolder, destinationParent, next);
                }
            }
        }

        this.provider.refresh();
    }

    public async copyPath(nodes: readonly ExplorerNode[], relative: boolean): Promise<void> {
        const paths = nodes.map((node) => relative
            ? vscode.workspace.asRelativePath(node.uri, false)
            : (node.uri.scheme === 'file' ? node.uri.fsPath : node.uri.toString()));
        if (paths.length) {
            await vscode.env.clipboard.writeText(paths.join('\n'));
        }
    }

    public async revealInOS(node?: ExplorerNode): Promise<void> {
        if (node) {
            await vscode.commands.executeCommand('revealFileInOS', node.uri);
        }
    }

    public async openTerminal(node?: ExplorerNode): Promise<void> {
        if (!node) {
            return;
        }
        const cwd = node.isDirectory ? node.uri : dirname(node.uri);
        const terminal = vscode.window.createTerminal({
            name: `Ordered Explorer: ${node.name}`,
            cwd,
        });
        terminal.show();

        if (cwd.scheme !== 'file') {
            terminal.sendText(`cd ${quoteShellPath(cwd.path)}`, true);
        }
    }

    public async compare(nodes: readonly ExplorerNode[]): Promise<void> {
        const files = nodes.filter((node) => !node.isDirectory);
        if (files.length !== 2) {
            void vscode.window.showInformationMessage('Select exactly two files to compare.');
            return;
        }
        await vscode.commands.executeCommand(
            'vscode.diff',
            files[0]!.uri,
            files[1]!.uri,
            `${files[0]!.name} ↔ ${files[1]!.name}`,
        );
    }

    private resolveTargetDirectory(target?: ExplorerNode): ExplorerNode | undefined {
        if (target?.isDirectory) {
            return target;
        }
        if (target?.parent) {
            return target.parent;
        }
        const folder = vscode.workspace.workspaceFolders?.[0];
        return folder
            ? new ExplorerNode(folder.uri, vscode.FileType.Directory, folder, undefined, true)
            : undefined;
    }

    private validateRelativeInput(value: string): string | undefined {
        const trimmed = value.trim();
        if (!trimmed) {
            return 'A name is required.';
        }
        if (!trimmed.replace(/[\\/]+$/, '')) {
            return 'A file or folder name is required before the trailing slash.';
        }
        if (trimmed.startsWith('/') || /^[A-Za-z]:[\\/]/.test(trimmed)) {
            return 'Use a path relative to the selected folder.';
        }
        if (trimmed.split(/[\\/]/).some((part) => part === '..' || part === '.')) {
            return 'Relative navigation segments are not allowed.';
        }
        return undefined;
    }

    private validateSingleName(value: string, original: string): string | undefined {
        const relativeError = this.validateRelativeInput(value);
        if (relativeError) {
            return relativeError;
        }
        if (value.includes('/') || value.includes('\\')) {
            return 'Rename accepts a single file or folder name.';
        }
        if (value === original) {
            return undefined;
        }
        return undefined;
    }

    private joinUserPath(base: vscode.Uri, value: string): vscode.Uri {
        return vscode.Uri.joinPath(base, ...value.split(/[\\/]/).filter(Boolean));
    }

    private async ensureParentDirectory(uri: vscode.Uri): Promise<void> {
        await vscode.workspace.fs.createDirectory(dirname(uri));
    }

    private async exists(uri: vscode.Uri): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    private async uniqueCopyUri(
        node: ExplorerNode,
        destinationDirectory: vscode.Uri = dirname(node.uri),
    ): Promise<vscode.Uri> {
        const parsed = path.parse(node.name);
        const base = node.isDirectory ? node.name : parsed.name;
        const extension = node.isDirectory ? '' : parsed.ext;

        for (let index = 1; index < 10_000; index += 1) {
            const suffix = index === 1 ? ' copy' : ` copy ${index}`;
            const candidate = vscode.Uri.joinPath(
                destinationDirectory,
                `${base}${suffix}${extension}`,
            );
            if (!await this.exists(candidate)) {
                return candidate;
            }
        }

        throw new Error(`Unable to find a free duplicate name for ${node.name}.`);
    }

    private fileNameSelection(name: string, isDirectory: boolean): [number, number] {
        if (isDirectory) {
            return [0, name.length];
        }
        const extensionIndex = name.lastIndexOf('.');
        return [0, extensionIndex > 0 ? extensionIndex : name.length];
    }
}
