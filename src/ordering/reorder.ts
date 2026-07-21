import * as vscode from 'vscode';
import { ExplorerNode } from '../explorer/node';
import { OrderedExplorerProvider } from '../explorer/provider';
import { OrderConfigurationService } from './config';

export class ReorderService {
    public constructor(
        private readonly provider: OrderedExplorerProvider,
        private readonly configuration: OrderConfigurationService,
    ) {}

    public async moveUp(nodes: readonly ExplorerNode[]): Promise<void> {
        await this.moveBlock(nodes, 'up');
    }

    public async moveDown(nodes: readonly ExplorerNode[]): Promise<void> {
        await this.moveBlock(nodes, 'down');
    }

    public async moveToTop(nodes: readonly ExplorerNode[]): Promise<void> {
        await this.moveBlock(nodes, 'top');
    }

    public async moveToBottom(nodes: readonly ExplorerNode[]): Promise<void> {
        await this.moveBlock(nodes, 'bottom');
    }

    public async placeBefore(nodes: readonly ExplorerNode[]): Promise<void> {
        await this.placeRelative(nodes, false);
    }

    public async placeAfter(nodes: readonly ExplorerNode[]): Promise<void> {
        await this.placeRelative(nodes, true);
    }

    public async placeBeforeTarget(
        nodes: readonly ExplorerNode[],
        target: ExplorerNode,
    ): Promise<void> {
        const sameParent = this.sameParent(nodes);
        if (!sameParent || target.parent?.id !== sameParent.id) {
            return;
        }

        const ordered = await this.provider.getDirectoryChildren(sameParent);
        const selectedNames = new Set(nodes.map((node) => node.name));
        const selected = ordered.filter((node) => selectedNames.has(node.name));
        const remaining = ordered.filter((node) => !selectedNames.has(node.name));
        const targetIndex = remaining.findIndex((node) => node.name === target.name);
        if (targetIndex < 0) {
            return;
        }

        remaining.splice(targetIndex, 0, ...selected);
        await this.saveExactOrder(sameParent, remaining);
    }

    public async removeCustomPosition(nodes: readonly ExplorerNode[]): Promise<void> {
        const parent = this.sameParent(nodes);
        if (!parent) {
            return;
        }
        const names = new Set(nodes.map((node) => node.name));
        const order = this.configuration.getOrder(parent.workspaceFolder, parent.relativePath);
        await this.configuration.updateOrder(
            parent.workspaceFolder,
            parent.relativePath,
            order.filter((entry) => !names.has(entry)),
        );
        this.provider.refresh(parent);
    }

    private async moveBlock(
        nodes: readonly ExplorerNode[],
        direction: 'up' | 'down' | 'top' | 'bottom',
    ): Promise<void> {
        const parent = this.sameParent(nodes);
        if (!parent) {
            void vscode.window.showInformationMessage('Selected items must share the same parent folder.');
            return;
        }

        const ordered = await this.provider.getDirectoryChildren(parent);
        const selectedNames = new Set(nodes.map((node) => node.name));
        const selected = ordered.filter((node) => selectedNames.has(node.name));
        if (!selected.length) {
            return;
        }

        const firstIndex = ordered.findIndex((node) => selectedNames.has(node.name));
        const remaining = ordered.filter((node) => !selectedNames.has(node.name));
        let insertionIndex: number;

        if (direction === 'top') {
            insertionIndex = 0;
        } else if (direction === 'bottom') {
            insertionIndex = remaining.length;
        } else if (direction === 'up') {
            insertionIndex = Math.max(0, firstIndex - 1);
        } else {
            insertionIndex = Math.min(remaining.length, firstIndex + 1);
        }

        remaining.splice(insertionIndex, 0, ...selected);
        await this.saveExactOrder(parent, remaining);
    }

    private async placeRelative(
        nodes: readonly ExplorerNode[],
        after: boolean,
    ): Promise<void> {
        const parent = this.sameParent(nodes);
        if (!parent) {
            void vscode.window.showInformationMessage('Selected items must share the same parent folder.');
            return;
        }

        const ordered = await this.provider.getDirectoryChildren(parent);
        const selectedNames = new Set(nodes.map((node) => node.name));
        const choices = ordered
            .filter((node) => !selectedNames.has(node.name))
            .map((node) => ({ label: node.name, node }));

        const chosen = await vscode.window.showQuickPick(choices, {
            title: after ? 'Place After' : 'Place Before',
            placeHolder: 'Select the anchor item',
        });
        if (!chosen) {
            return;
        }

        const selected = ordered.filter((node) => selectedNames.has(node.name));
        const remaining = ordered.filter((node) => !selectedNames.has(node.name));
        const anchorIndex = remaining.findIndex((node) => node.name === chosen.node.name);
        remaining.splice(anchorIndex + (after ? 1 : 0), 0, ...selected);
        await this.saveExactOrder(parent, remaining);
    }

    private async saveExactOrder(
        parent: ExplorerNode,
        children: readonly ExplorerNode[],
    ): Promise<void> {
        await this.configuration.updateOrder(
            parent.workspaceFolder,
            parent.relativePath,
            [...children.map((node) => node.name), '*'],
        );
        this.provider.refresh(parent);
    }

    private sameParent(nodes: readonly ExplorerNode[]): ExplorerNode | undefined {
        const parent = nodes[0]?.parent;
        if (!parent || nodes.some((node) => node.parent?.id !== parent.id)) {
            return undefined;
        }
        return parent;
    }
}
