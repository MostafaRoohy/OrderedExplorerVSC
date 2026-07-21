import * as path from 'node:path';

export interface TreeEntry {
    readonly name: string;
    readonly isDirectory: boolean;
    readonly children: TreeEntry[];
}

export function renderTree(entries: readonly TreeEntry[]): string {
    const lines: string[] = [];

    const visit = (entry: TreeEntry, prefix: string, isLast: boolean, isRoot: boolean): void => {
        const connector = isRoot ? '' : (isLast ? '└── ' : '├── ');
        lines.push(`${prefix}${connector}${entry.name}${entry.isDirectory ? '/' : ''}`);

        const childPrefix = isRoot
            ? ''
            : `${prefix}${isLast ? '    ' : '│   '}`;
        entry.children.forEach((child, index) => {
            visit(child, childPrefix, index === entry.children.length - 1, false);
        });
    };

    entries.forEach((entry, index) => {
        visit(entry, '', index === entries.length - 1, true);
    });

    return lines.join('\n');
}

export function looksBinary(bytes: Uint8Array): boolean {
    const sampleLength = Math.min(bytes.length, 8192);
    if (!sampleLength) {
        return false;
    }

    let suspicious = 0;
    for (let index = 0; index < sampleLength; index += 1) {
        const value = bytes[index]!;
        if (value === 0) {
            return true;
        }
        if (value < 7 || (value > 13 && value < 32)) {
            suspicious += 1;
        }
    }

    return suspicious / sampleLength > 0.1;
}

export function languageForPath(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase().slice(1);
    const aliases: Record<string, string> = {
        js: 'javascript',
        jsx: 'javascript',
        ts: 'typescript',
        tsx: 'typescript',
        py: 'python',
        rs: 'rust',
        sh: 'bash',
        yml: 'yaml',
    };
    return aliases[extension] ?? extension;
}
