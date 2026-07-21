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

function commandsFor(
    menu: string,
    useSubmenus: boolean,
    useEmojiTitles: boolean,
): string[] {
    return (manifest.contributes.menus[menu] ?? [])
        .filter((entry) => {
            const when = entry.when ?? '';
            const submenuMatches = useSubmenus
                ? when.includes('&& config.orderedExplorer.contextMenu.useSubmenus')
                : when.includes('&& !config.orderedExplorer.contextMenu.useSubmenus');
            const emojiMatches = useEmojiTitles
                ? when.includes('&& config.orderedExplorer.contextMenu.useEmojiTitles')
                : when.includes('&& !config.orderedExplorer.contextMenu.useEmojiTitles');
            return submenuMatches && emojiMatches;
        })
        .sort((left, right) => (left.group ?? '').localeCompare(right.group ?? ''))
        .map((entry) => entry.command ?? `submenu:${entry.submenu}`);
}

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

    it('provides the approved plain and emoji submenu labels', () => {
        const labels = new Map(
            manifest.contributes.submenus.map((submenu) => [submenu.id, submenu.label]),
        );

        expect(labels).toEqual(new Map([
            ['orderedExplorer.submenu.openIn', 'Open In'],
            ['orderedExplorer.submenu.openInEmoji', '🛠️ Open In'],
            ['orderedExplorer.submenu.clipboard', 'Clipboard'],
            ['orderedExplorer.submenu.clipboardEmoji', '📋 Clipboard'],
            ['orderedExplorer.submenu.order', 'Order'],
            ['orderedExplorer.submenu.orderEmoji', '↕️ Order'],
        ]));
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

    it('uses the approved submenu top-level order', () => {
        const plain = commandsFor('view/item/context', true, false);

        expect(plain).toEqual([
            'orderedExplorer.openToSide',
            'orderedExplorer.compareSelected',
            'orderedExplorer.newFile',
            'orderedExplorer.newFolder',
            'orderedExplorer.rename',
            'orderedExplorer.duplicate',
            'orderedExplorer.move',
            'orderedExplorer.delete',
            'orderedExplorer.deletePermanently',
            'submenu:orderedExplorer.submenu.openIn',
            'submenu:orderedExplorer.submenu.clipboard',
            'submenu:orderedExplorer.submenu.order',
        ]);
    });

    it('uses the approved flat-menu order', () => {
        const plain = commandsFor('view/item/context', false, false);

        expect(plain).toEqual([
            'orderedExplorer.openToSide',
            'orderedExplorer.newFile',
            'orderedExplorer.newFolder',
            'orderedExplorer.rename',
            'orderedExplorer.duplicate',
            'orderedExplorer.move',
            'orderedExplorer.delete',
            'orderedExplorer.deletePermanently',
            'orderedExplorer.compareSelected',
            'orderedExplorer.copy',
            'orderedExplorer.cut',
            'orderedExplorer.paste',
            'orderedExplorer.copyPath',
            'orderedExplorer.copyRelativePath',
            'orderedExplorer.copyForAI',
            'orderedExplorer.copyProjectStructure',
            'orderedExplorer.revealInOS',
            'orderedExplorer.openTerminal',
            'orderedExplorer.moveUp',
            'orderedExplorer.moveDown',
            'orderedExplorer.moveToTop',
            'orderedExplorer.moveToBottom',
            'orderedExplorer.placeBefore',
            'orderedExplorer.placeAfter',
            'orderedExplorer.removeCustomPosition',
        ]);
    });

    it('uses the approved command order inside each submenu', () => {
        expect((manifest.contributes.menus['orderedExplorer.submenu.openIn'] ?? [])
            .map((entry) => entry.command)).toEqual([
            'orderedExplorer.revealInOS',
            'orderedExplorer.openTerminal',
        ]);
        expect((manifest.contributes.menus['orderedExplorer.submenu.clipboard'] ?? [])
            .map((entry) => entry.command)).toEqual([
            'orderedExplorer.copy',
            'orderedExplorer.cut',
            'orderedExplorer.paste',
            'orderedExplorer.copyPath',
            'orderedExplorer.copyRelativePath',
            'orderedExplorer.copyForAI',
            'orderedExplorer.copyProjectStructure',
        ]);
        expect((manifest.contributes.menus['orderedExplorer.submenu.order'] ?? [])
            .map((entry) => entry.command)).toEqual([
            'orderedExplorer.moveUp',
            'orderedExplorer.moveDown',
            'orderedExplorer.moveToTop',
            'orderedExplorer.moveToBottom',
            'orderedExplorer.placeBefore',
            'orderedExplorer.placeAfter',
            'orderedExplorer.removeCustomPosition',
        ]);
    });

    it('uses the approved concise command labels', () => {
        const titles = new Map(
            manifest.contributes.commands.map((command) => [command.command, command.title]),
        );

        expect(titles.get('orderedExplorer.copyForAI')).toBe('Copy Content to Clipboard');
        expect(titles.get('orderedExplorer.copyProjectStructure')).toBe(
            'Copy Hierarchy to Clipboard',
        );
        expect(titles.get('orderedExplorer.moveUp')).toBe('Move Up');
        expect(titles.get('orderedExplorer.moveDown')).toBe('Move Down');
        expect(titles.get('orderedExplorer.moveToTop')).toBe('Move to Top');
        expect(titles.get('orderedExplorer.moveToBottom')).toBe('Move to Bottom');
        expect(titles.get('orderedExplorer.menuEmoji.compareSelected')).toBe(
            '⚖️ Git Diff Selected',
        );
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
