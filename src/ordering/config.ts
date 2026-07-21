import * as vscode from 'vscode';
import type {
    ExplorerConfig,
    FallbackSort,
    MultiRootOrderConfig,
    RootOrderConfig,
    StaleOrderReport,
} from '../types';
import { joinRelative, normalizeRelativePath } from '../util/path';
import { insertBeforeWildcard, normalizeOrder } from './sorter';

const SECTION = 'orderedExplorer';

function cloneDirectoryOrder(
    value: Readonly<Record<string, readonly string[]>>,
): Record<string, string[]> {
    return Object.fromEntries(
        Object.entries(value).map(([key, order]) => [normalizeRelativePath(key), [...order]]),
    );
}

export class OrderConfigurationService {
    public get(folder: vscode.WorkspaceFolder): ExplorerConfig {
        const configuration = vscode.workspace.getConfiguration(SECTION, folder.uri);
        const rootConfig = this.getRootConfig(configuration, folder);

        return {
            order: normalizeOrder(rootConfig.order),
            directoryOrder: cloneDirectoryOrder(rootConfig.directoryOrder),
            fallbackSort: configuration.get<FallbackSort>('fallbackSort', 'default'),
            autoReveal: configuration.get<boolean>('autoReveal', true),
            showExcludedFiles: configuration.get<boolean>('showExcludedFiles', false),
            confirmTrashDelete: this.getDeleteConfirmation(
                configuration,
                'confirmTrashDelete',
            ),
            confirmPermanentDelete: this.getDeleteConfirmation(
                configuration,
                'confirmPermanentDelete',
            ),
            followSymlinks: configuration.get<boolean>('followSymlinks', false),
        };
    }

    public getOrder(folder: vscode.WorkspaceFolder, parentRelativePath: string): string[] {
        const config = this.get(folder);
        const key = normalizeRelativePath(parentRelativePath);
        return normalizeOrder(key ? (config.directoryOrder[key] ?? ['*']) : config.order);
    }

    public async updateOrder(
        folder: vscode.WorkspaceFolder,
        parentRelativePath: string,
        order: readonly string[],
    ): Promise<void> {
        const configuration = vscode.workspace.getConfiguration(SECTION, folder.uri);
        const normalizedParent = normalizeRelativePath(parentRelativePath);
        const normalizedOrder = normalizeOrder(order);

        if ((vscode.workspace.workspaceFolders?.length ?? 0) > 1) {
            const roots = configuration.get<Record<string, MultiRootOrderConfig>>('roots', {});
            const current = roots[folder.name] ?? {};
            const next: Record<string, MultiRootOrderConfig> = { ...roots };

            if (!normalizedParent) {
                next[folder.name] = {
                    ...current,
                    order: normalizedOrder,
                };
            } else {
                const directoryOrder = cloneDirectoryOrder(current.directoryOrder ?? {});
                directoryOrder[normalizedParent] = normalizedOrder;
                next[folder.name] = {
                    ...current,
                    directoryOrder,
                };
            }

            await configuration.update('roots', next, vscode.ConfigurationTarget.Workspace);
            return;
        }

        if (!normalizedParent) {
            await configuration.update('order', normalizedOrder, vscode.ConfigurationTarget.Workspace);
            return;
        }

        const directoryOrder = cloneDirectoryOrder(
            configuration.get<Record<string, readonly string[]>>('directoryOrder', {}),
        );
        directoryOrder[normalizedParent] = normalizedOrder;
        await configuration.update(
            'directoryOrder',
            directoryOrder,
            vscode.ConfigurationTarget.Workspace,
        );
    }

    public async renameEntry(
        folder: vscode.WorkspaceFolder,
        parentRelativePath: string,
        oldName: string,
        newName: string,
        oldRelativePath: string,
        newRelativePath: string,
        isDirectory: boolean,
    ): Promise<void> {
        const order = this.getOrder(folder, parentRelativePath);
        if (order.includes(oldName)) {
            await this.updateOrder(
                folder,
                parentRelativePath,
                order.map((item) => item === oldName ? newName : item),
            );
        }

        if (isDirectory) {
            await this.rewriteDirectoryPrefixes(folder, oldRelativePath, newRelativePath);
        }
    }

    public async moveEntry(
        folder: vscode.WorkspaceFolder,
        sourceParent: string,
        destinationParent: string,
        name: string,
        sourceRelativePath: string,
        destinationRelativePath: string,
        isDirectory: boolean,
    ): Promise<void> {
        const sourceOrder = this.getOrder(folder, sourceParent);
        if (sourceOrder.includes(name)) {
            await this.updateOrder(
                folder,
                sourceParent,
                sourceOrder.filter((item) => item !== name),
            );
        }

        const destinationOrder = this.getOrder(folder, destinationParent);
        await this.updateOrder(
            folder,
            destinationParent,
            insertBeforeWildcard(destinationOrder, name),
        );

        if (isDirectory) {
            await this.rewriteDirectoryPrefixes(
                folder,
                sourceRelativePath,
                destinationRelativePath,
            );
        }
    }

    public async deleteEntry(
        folder: vscode.WorkspaceFolder,
        parentRelativePath: string,
        name: string,
        relativePath: string,
        isDirectory: boolean,
    ): Promise<void> {
        const order = this.getOrder(folder, parentRelativePath);
        if (order.includes(name)) {
            await this.updateOrder(
                folder,
                parentRelativePath,
                order.filter((item) => item !== name),
            );
        }

        if (isDirectory) {
            await this.removeDirectoryPrefix(folder, relativePath);
        }
    }

    private getDeleteConfirmation(
        configuration: vscode.WorkspaceConfiguration,
        key: 'confirmTrashDelete' | 'confirmPermanentDelete',
    ): boolean {
        const explicit = configuration.inspect<boolean>(key);
        const hasExplicitValue = explicit?.workspaceFolderValue !== undefined
            || explicit?.workspaceValue !== undefined
            || explicit?.globalValue !== undefined;
        if (hasExplicitValue) {
            return configuration.get<boolean>(key, true);
        }

        return configuration.get<boolean>('confirmDelete', true);
    }

    private getRootConfig(
        configuration: vscode.WorkspaceConfiguration,
        folder: vscode.WorkspaceFolder,
    ): RootOrderConfig {
        if ((vscode.workspace.workspaceFolders?.length ?? 0) > 1) {
            const roots = configuration.get<Record<string, MultiRootOrderConfig>>('roots', {});
            const selected = roots[folder.name] ?? {};
            return {
                order: selected.order ?? ['*'],
                directoryOrder: selected.directoryOrder ?? {},
            };
        }

        return {
            order: configuration.get<readonly string[]>('order', ['*']),
            directoryOrder: configuration.get<Record<string, readonly string[]>>(
                'directoryOrder',
                {},
            ),
        };
    }

    private async rewriteDirectoryPrefixes(
        folder: vscode.WorkspaceFolder,
        oldPrefix: string,
        newPrefix: string,
    ): Promise<void> {
        const config = this.get(folder);
        const next: Record<string, string[]> = {};
        let changed = false;

        for (const [key, value] of Object.entries(config.directoryOrder)) {
            if (key === oldPrefix || key.startsWith(`${oldPrefix}/`)) {
                const suffix = key.slice(oldPrefix.length).replace(/^\//, '');
                next[joinRelative(newPrefix, suffix)] = [...value];
                changed = true;
            } else {
                next[key] = [...value];
            }
        }

        if (changed) {
            await this.replaceDirectoryOrder(folder, next);
        }
    }

    private async removeDirectoryPrefix(
        folder: vscode.WorkspaceFolder,
        prefix: string,
    ): Promise<void> {
        const config = this.get(folder);
        const next = Object.fromEntries(
            Object.entries(config.directoryOrder)
                .filter(([key]) => key !== prefix && !key.startsWith(`${prefix}/`))
                .map(([key, value]) => [key, [...value]]),
        );

        if (Object.keys(next).length !== Object.keys(config.directoryOrder).length) {
            await this.replaceDirectoryOrder(folder, next);
        }
    }

    private async replaceDirectoryOrder(
        folder: vscode.WorkspaceFolder,
        directoryOrder: Record<string, string[]>,
    ): Promise<void> {
        const configuration = vscode.workspace.getConfiguration(SECTION, folder.uri);

        if ((vscode.workspace.workspaceFolders?.length ?? 0) > 1) {
            const roots = configuration.get<Record<string, MultiRootOrderConfig>>('roots', {});
            const current = roots[folder.name] ?? {};
            await configuration.update(
                'roots',
                {
                    ...roots,
                    [folder.name]: {
                        ...current,
                        directoryOrder,
                    },
                },
                vscode.ConfigurationTarget.Workspace,
            );
            return;
        }

        await configuration.update(
            'directoryOrder',
            directoryOrder,
            vscode.ConfigurationTarget.Workspace,
        );
    }
}
