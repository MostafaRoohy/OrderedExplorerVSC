import * as vscode from 'vscode';
import { ExplorerNode } from '../explorer/node';
import { OrderedExplorerProvider } from '../explorer/provider';
import { languageForPath, looksBinary, renderTree, TreeEntry } from './aiCopyFormat';

interface CollectedFile {
    readonly node: ExplorerNode;
    readonly relativePath: string;
}

const MAX_FILE_SIZE = 1024 * 1024;

export class AiCopyService {
    public constructor(
        private readonly provider: OrderedExplorerProvider,
    ) {}

    public async copyToClipboard(nodes: readonly ExplorerNode[]): Promise<void> {
        const roots = this.normalizeSelection(nodes);
        if (!roots.length) {
            void vscode.window.showInformationMessage('Select at least one file or folder.');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Preparing files for clipboard…',
            cancellable: true,
        }, async (_progress, token) => {
            const treeEntries: TreeEntry[] = [];
            const files: CollectedFile[] = [];

            for (const node of roots) {
                if (token.isCancellationRequested) {
                    return;
                }
                treeEntries.push(await this.collect(node, files, token));
            }

            const sections: string[] = [
                '# Project Structure',
                '',
                '```text',
                renderTree(treeEntries),
                '```',
            ];

            for (const file of files) {
                if (token.isCancellationRequested) {
                    return;
                }

                const content = await this.readTextFile(file.node.uri);
                if (content === undefined) {
                    continue;
                }

                sections.push(
                    '',
                    `## ${file.relativePath}`,
                    '',
                    `\`\`\`${languageForPath(file.relativePath)}`,
                    content,
                    '```',
                );
            }

            await vscode.env.clipboard.writeText(sections.join('\n'));
            void vscode.window.showInformationMessage(
                `Copied ${files.length} file${files.length === 1 ? '' : 's'} and project structure.`,
            );
        });
    }

    public async copyProjectStructure(nodes: readonly ExplorerNode[]): Promise<void> {
        const roots = this.normalizeSelection(nodes);
        if (!roots.length) {
            void vscode.window.showInformationMessage('Select at least one file or folder.');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Preparing project structure…',
            cancellable: true,
        }, async (_progress, token) => {
            const treeEntries: TreeEntry[] = [];
            for (const node of roots) {
                if (token.isCancellationRequested) {
                    return;
                }
                treeEntries.push(await this.collect(node, [], token, false));
            }

            await vscode.env.clipboard.writeText(renderTree(treeEntries));
            void vscode.window.showInformationMessage('Copied project structure.');
        });
    }

    private normalizeSelection(nodes: readonly ExplorerNode[]): ExplorerNode[] {
        const unique = new Map(nodes.map((node) => [node.uri.toString(), node]));
        const selected = [...unique.values()];

        return selected.filter((candidate) => !selected.some((other) => (
            other !== candidate
            && other.isDirectory
            && isParentUri(other.uri, candidate.uri)
        )));
    }

    private async collect(
        node: ExplorerNode,
        files: CollectedFile[],
        token: vscode.CancellationToken,
        collectFiles: boolean = true,
    ): Promise<TreeEntry> {
        if (!node.isDirectory) {
            if (collectFiles) {
                files.push({
                    node,
                    relativePath: this.displayPath(node),
                });
            }
            return { name: node.name, isDirectory: false, children: [] };
        }

        const children = token.isCancellationRequested
            ? []
            : await this.provider.getDirectoryChildren(node);
        const entries: TreeEntry[] = [];

        for (const child of children) {
            if (token.isCancellationRequested) {
                break;
            }
            entries.push(await this.collect(child, files, token, collectFiles));
        }

        return { name: node.name, isDirectory: true, children: entries };
    }

    private displayPath(node: ExplorerNode): string {
        if (node.isWorkspaceRoot) {
            return node.name;
        }
        return node.relativePath || node.name;
    }

    private async readTextFile(uri: vscode.Uri): Promise<string | undefined> {
        let stat: vscode.FileStat;
        try {
            stat = await vscode.workspace.fs.stat(uri);
        } catch {
            return undefined;
        }

        if (stat.size > MAX_FILE_SIZE) {
            return `[File omitted: larger than ${MAX_FILE_SIZE} bytes]`;
        }

        let bytes: Uint8Array;
        try {
            bytes = await vscode.workspace.fs.readFile(uri);
        } catch {
            return undefined;
        }

        if (looksBinary(bytes)) {
            return '[Binary file omitted]';
        }

        return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }
}

function isParentUri(parent: vscode.Uri, child: vscode.Uri): boolean {
    if (parent.scheme !== child.scheme || parent.authority !== child.authority) {
        return false;
    }
    const parentPath = parent.path.endsWith('/') ? parent.path : `${parent.path}/`;
    return child.path.startsWith(parentPath);
}
