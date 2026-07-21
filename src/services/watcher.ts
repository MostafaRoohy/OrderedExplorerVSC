import * as vscode from 'vscode';
import { dirname } from '../util/path';
import { OrderedExplorerProvider } from '../explorer/provider';

export class ExplorerWatcher implements vscode.Disposable {
    private readonly disposables: vscode.Disposable[] = [];
    private readonly folderWatchers: vscode.Disposable[] = [];
    private readonly pending = new Map<string, NodeJS.Timeout>();

    public constructor(private readonly provider: OrderedExplorerProvider) {
        this.rebuildWatchers();

        this.disposables.push(
            vscode.workspace.onDidChangeWorkspaceFolders(() => {
                this.rebuildWatchers();
                this.provider.refresh();
            }),
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (
                    event.affectsConfiguration('orderedExplorer')
                    || event.affectsConfiguration('files.exclude')
                    || event.affectsConfiguration('explorer.fileNesting')
                    || event.affectsConfiguration('explorer.compactFolders')
                ) {
                    this.provider.refresh();
                }
            }),
        );
    }

    public dispose(): void {
        this.folderWatchers.splice(0).forEach((disposable) => disposable.dispose());
        this.disposables.splice(0).forEach((disposable) => disposable.dispose());
        for (const timeout of this.pending.values()) {
            clearTimeout(timeout);
        }
        this.pending.clear();
    }

    private rebuildWatchers(): void {
        this.folderWatchers.splice(0).forEach((disposable) => disposable.dispose());

        for (const folder of vscode.workspace.workspaceFolders ?? []) {
            const watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(folder, '**/*'),
            );
            this.folderWatchers.push(
                watcher,
                watcher.onDidCreate((uri) => this.scheduleRefresh(dirname(uri))),
                watcher.onDidChange((uri) => this.scheduleRefresh(dirname(uri))),
                watcher.onDidDelete((uri) => this.scheduleRefresh(dirname(uri))),
            );
        }
    }

    private scheduleRefresh(uri: vscode.Uri): void {
        const key = uri.toString();
        const current = this.pending.get(key);
        if (current) {
            clearTimeout(current);
        }

        this.pending.set(key, setTimeout(() => {
            this.pending.delete(key);
            this.provider.refreshUri(uri);
        }, 100));
    }
}
