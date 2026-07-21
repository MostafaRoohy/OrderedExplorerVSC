import * as vscode from 'vscode';

export type FallbackSort = 'default' | 'mixed' | 'filesFirst' | 'type' | 'modified';

export interface RootOrderConfig {
    readonly order: readonly string[];
    readonly directoryOrder: Readonly<Record<string, readonly string[]>>;
}

export interface ExplorerConfig extends RootOrderConfig {
    readonly fallbackSort: FallbackSort;
    readonly autoReveal: boolean;
    readonly showExcludedFiles: boolean;
    readonly confirmDelete: boolean;
    readonly followSymlinks: boolean;
}

export interface MultiRootOrderConfig {
    readonly order?: readonly string[];
    readonly directoryOrder?: Readonly<Record<string, readonly string[]>>;
}

export interface ClipboardState {
    readonly uris: readonly vscode.Uri[];
    readonly cut: boolean;
}

export interface StaleOrderReport {
    readonly removed: readonly string[];
    readonly retained: readonly string[];
}
