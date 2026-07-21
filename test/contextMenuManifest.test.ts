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

function submenuCommands(menu: string): string[] {
    return (manifest.contributes.menus[menu] ?? [])
        .sort((left, right) => (left.group ?? '').localeCompare(right.group ?? ''))
        .map((entry) => entry.command ?? '');
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
            ['orderedExplorer.submenu.new', 'New...'],
            ['orderedExplorer.submenu.newEmoji', 'New...'],
            ['orderedExplorer.submenu.delete', 'Delete...'],
            ['orderedExplorer.submenu.deleteEmoji', 'Delete...'],
            ['orderedExplorer.submenu.openIn', 'Open In...'],
            ['orderedExplorer.submenu.openInEmoji', 'Open In...'],
            ['orderedExplorer.submenu.clipboard', 'Clipboard'],
            ['orderedExplorer.submenu.clipboardEmoji', '📋 Clipboard'],
            ['orderedExplorer.submenu.path', 'Path'],
            ['orderedExplorer.submenu.pathEmoji', 'Path'],
            ['orderedExplorer.submenu.content', 'Content'],
            ['orderedExplorer.submenu.contentEmoji', 'Content'],
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
            'orderedExplorer.rename',
            'submenu:orderedExplorer.submenu.new',
            'submenu:orderedExplorer.submenu.delete',
            'submenu:orderedExplorer.submenu.openIn',
            'submenu:orderedExplorer.submenu.clipboard',
            'submenu:orderedExplorer.submenu.path',
            'submenu:orderedExplorer.submenu.content',
            'submenu:orderedExplorer.submenu.order',
        ]);
    });

    it('uses the approved flat-menu order without duplicate Git Diff', () => {
        const plain = commandsFor('view/item/context', false, false);

        expect(plain).toEqual([
            'orderedExplorer.openToSide',
            'orderedExplorer.compareSelected',
            'orderedExplorer.rename',
            'orderedExplorer.newFile',
            'orderedExplorer.newFolder',
            'orderedExplorer.delete',
            'orderedExplorer.deletePermanently',
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
        expect(plain.filter((command) => command === 'orderedExplorer.compareSelected')).toHaveLength(1);
    });

    it('uses the approved command order inside each plain submenu', () => {
        expect(submenuCommands('orderedExplorer.submenu.new')).toEqual([
            'orderedExplorer.menuSubmenu.newFile',
            'orderedExplorer.menuSubmenu.newFolder',
        ]);
        expect(submenuCommands('orderedExplorer.submenu.delete')).toEqual([
            'orderedExplorer.menuSubmenu.delete',
            'orderedExplorer.menuSubmenu.deletePermanently',
        ]);
        expect(submenuCommands('orderedExplorer.submenu.openIn')).toEqual([
            'orderedExplorer.menuSubmenu.revealInOS',
            'orderedExplorer.menuSubmenu.openTerminal',
        ]);
        expect(submenuCommands('orderedExplorer.submenu.clipboard')).toEqual([
            'orderedExplorer.copy',
            'orderedExplorer.cut',
            'orderedExplorer.paste',
        ]);
        expect(submenuCommands('orderedExplorer.submenu.path')).toEqual([
            'orderedExplorer.copyPath',
            'orderedExplorer.copyRelativePath',
        ]);
        expect(submenuCommands('orderedExplorer.submenu.content')).toEqual([
            'orderedExplorer.copyForAI',
            'orderedExplorer.copyProjectStructure',
        ]);
        expect(submenuCommands('orderedExplorer.submenu.order')).toEqual([
            'orderedExplorer.moveUp',
            'orderedExplorer.moveDown',
            'orderedExplorer.moveToTop',
            'orderedExplorer.moveToBottom',
            'orderedExplorer.placeBefore',
            'orderedExplorer.placeAfter',
            'orderedExplorer.removeCustomPosition',
        ]);
    });

    it('uses concise submenu-specific labels', () => {
        const titles = new Map(
            manifest.contributes.commands.map((command) => [command.command, command.title]),
        );

        expect(titles.get('orderedExplorer.menuSubmenu.newFile')).toBe('File...');
        expect(titles.get('orderedExplorer.menuSubmenu.newFolder')).toBe('Folder...');
        expect(titles.get('orderedExplorer.menuSubmenu.delete')).toBe('Trash');
        expect(titles.get('orderedExplorer.menuSubmenu.deletePermanently')).toBe('Permanently');
        expect(titles.get('orderedExplorer.menuSubmenu.revealInOS')).toBe('File Explorer');
        expect(titles.get('orderedExplorer.menuSubmenu.openTerminal')).toBe('Integrated Terminal');
        expect(titles.get('orderedExplorer.menuSubmenuEmoji.delete')).toBe('🗑️ Trash');
        expect(titles.get('orderedExplorer.menuSubmenuEmoji.openTerminal')).toBe(
            '💻 Integrated Terminal',
        );
    });

    it('removes Duplicate and Move To commands from the extension', () => {
        const commands = new Set(
            manifest.contributes.commands.map((command) => command.command),
        );
        const allMenuCommands = Object.values(manifest.contributes.menus)
            .flatMap((entries) => entries.map((entry) => entry.command))
            .filter((command): command is string => Boolean(command));
        const controllerSource = readFileSync(
            resolve(process.cwd(), 'src/commands/controller.ts'),
            'utf8',
        );

        expect(commands.has('orderedExplorer.duplicate')).toBe(false);
        expect(commands.has('orderedExplorer.move')).toBe(false);
        expect(allMenuCommands).not.toContain('orderedExplorer.duplicate');
        expect(allMenuCommands).not.toContain('orderedExplorer.move');
        expect(controllerSource).not.toContain("this.register('orderedExplorer.duplicate'");
        expect(controllerSource).not.toContain("this.register('orderedExplorer.move'");
    });

    it('registers every presentation alias in the command controller', () => {
        const controllerSource = readFileSync(
            resolve(process.cwd(), 'src/commands/controller.ts'),
            'utf8',
        );
        const aliases = manifest.contributes.commands
            .map((command) => command.command)
            .filter((command) => command.startsWith('orderedExplorer.menu'));

        expect(aliases.every((command) => controllerSource.includes(`'${command}'`))).toBe(true);
    });

    it('hides presentation aliases from the Command Palette', () => {
        const aliases = manifest.contributes.commands
            .map((command) => command.command)
            .filter((command) => command.startsWith('orderedExplorer.menu'));
        const hiddenCommands = new Set(
            (manifest.contributes.menus.commandPalette ?? [])
                .filter((entry) => entry.when === 'false')
                .map((entry) => entry.command),
        );

        expect(aliases.length).toBeGreaterThan(0);
        expect(aliases.every((command) => hiddenCommands.has(command))).toBe(true);
    });
});
