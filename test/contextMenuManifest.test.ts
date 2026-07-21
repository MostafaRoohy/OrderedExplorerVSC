import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type MenuEntry = {
    command?: string;
    submenu?: string;
    when?: string;
    group?: string;
};

type PackageManifest = {
    version: string;
    contributes: {
        commands: Array<{ command: string; title: string }>;
        submenus: Array<{ id: string; label: string }>;
        menus: Record<string, MenuEntry[]>;
        configuration: {
            properties: Record<string, {
                type: string;
                default: unknown;
            }>;
        };
    };
};

const manifest = JSON.parse(readFileSync(
    resolve(process.cwd(), 'package.json'),
    'utf8',
)) as PackageManifest;

describe('context-menu manifest', () => {
    it('contributes enabled-by-default submenu and emoji settings', () => {
        const properties = manifest.contributes.configuration.properties;

        expect(properties['orderedExplorer.contextMenu.useSubmenus']).toMatchObject({
            type: 'boolean',
            default: true,
        });
        expect(properties['orderedExplorer.contextMenu.useEmojiTitles']).toMatchObject({
            type: 'boolean',
            default: true,
        });
    });

    it('provides plain and emoji submenu labels', () => {
        const labels = new Map(
            manifest.contributes.submenus.map((submenu) => [submenu.id, submenu.label]),
        );

        expect(labels.get('orderedExplorer.submenu.clipboardAi')).toBe('ClipBoard');
        expect(labels.get('orderedExplorer.submenu.clipboardAiEmoji')).toBe('📋 ClipBoard');
        expect(labels.get('orderedExplorer.submenu.customOrder')).toBe('Custom Order');
        expect(labels.get('orderedExplorer.submenu.customOrderEmoji')).toBe('↕️ Custom Order');
        expect(labels.get('orderedExplorer.submenu.manage')).toBe('Manage');
        expect(labels.get('orderedExplorer.submenu.manageEmoji')).toBe('🛠️ Manage');
    });

    it('switches context-menu presentation through config when clauses', () => {
        const contextEntries = manifest.contributes.menus['view/item/context'] ?? [];
        const whenClauses = contextEntries.map((entry) => entry.when ?? '');

        expect(whenClauses.some((when) =>
            when.includes('config.orderedExplorer.contextMenu.useSubmenus'))).toBe(true);
        expect(whenClauses.some((when) =>
            when.includes('!config.orderedExplorer.contextMenu.useSubmenus'))).toBe(true);
        expect(whenClauses.some((when) =>
            when.includes('config.orderedExplorer.contextMenu.useEmojiTitles'))).toBe(true);
        expect(whenClauses.some((when) =>
            when.includes('!config.orderedExplorer.contextMenu.useEmojiTitles'))).toBe(true);
    });


    it('uses the requested submenu command order and removes obsolete manage commands', () => {
        const commandIds = new Set(
            manifest.contributes.commands.map((command) => command.command),
        );
        const manage = manifest.contributes.menus['orderedExplorer.submenu.manage'] ?? [];
        const clipboard = manifest.contributes.menus['orderedExplorer.submenu.clipboardAi'] ?? [];
        const customOrder = manifest.contributes.menus['orderedExplorer.submenu.customOrder'] ?? [];

        expect(manage.map((entry) => entry.command)).toEqual([
            'orderedExplorer.revealInOS',
            'orderedExplorer.openTerminal',
            'orderedExplorer.compareSelected',
        ]);
        expect(clipboard.map((entry) => entry.command)).toEqual([
            'orderedExplorer.copy',
            'orderedExplorer.cut',
            'orderedExplorer.paste',
            'orderedExplorer.copyPath',
            'orderedExplorer.copyRelativePath',
            'orderedExplorer.copyForAI',
            'orderedExplorer.copyProjectStructure',
        ]);
        expect(customOrder.map((entry) => entry.command)).toEqual([
            'orderedExplorer.moveUp',
            'orderedExplorer.moveDown',
            'orderedExplorer.moveToTop',
            'orderedExplorer.moveToBottom',
            'orderedExplorer.placeBefore',
            'orderedExplorer.placeAfter',
            'orderedExplorer.removeCustomPosition',
        ]);

        expect(commandIds.has('orderedExplorer.captureCurrentOrder')).toBe(false);
        expect(commandIds.has('orderedExplorer.resetDirectoryOrder')).toBe(false);
        expect(commandIds.has('orderedExplorer.cleanStaleOrder')).toBe(false);
    });

    it('registers every emoji presentation alias in the command controller', () => {
        const controllerSource = readFileSync(
            resolve(process.cwd(), 'src/commands/controller.ts'),
            'utf8',
        );
        const emojiAliases = manifest.contributes.commands
            .map((command) => command.command)
            .filter((command) => command.startsWith('orderedExplorer.menuEmoji.'));

        expect(emojiAliases.every((command) => controllerSource.includes(`'${command}'`))).toBe(true);
    });

    it('hides emoji presentation aliases from the Command Palette', () => {
        const emojiAliases = manifest.contributes.commands
            .map((command) => command.command)
            .filter((command) => command.startsWith('orderedExplorer.menuEmoji.'));
        const hiddenCommands = new Set(
            (manifest.contributes.menus.commandPalette ?? [])
                .filter((entry) => entry.when === 'false')
                .map((entry) => entry.command),
        );

        expect(emojiAliases.length).toBeGreaterThan(0);
        expect(emojiAliases.every((command) => hiddenCommands.has(command))).toBe(true);
    });
});
