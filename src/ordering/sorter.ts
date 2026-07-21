import type { FallbackSort } from '../types';

export interface SortableEntry {
    readonly name: string;
    readonly isDirectory: boolean;
    readonly modifiedTime: number | undefined;
}

const naturalCollator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
});

function extensionOf(name: string): string {
    const index = name.lastIndexOf('.');
    return index <= 0 ? '' : name.slice(index + 1).toLocaleLowerCase();
}

export function fallbackCompare<T extends SortableEntry>(
    left: T,
    right: T,
    mode: FallbackSort,
): number {
    if (mode === 'default') {
        if (left.isDirectory !== right.isDirectory) {
            return left.isDirectory ? -1 : 1;
        }
        return naturalCollator.compare(left.name, right.name);
    }

    if (mode === 'filesFirst') {
        if (left.isDirectory !== right.isDirectory) {
            return left.isDirectory ? 1 : -1;
        }
        return naturalCollator.compare(left.name, right.name);
    }

    if (mode === 'type') {
        if (left.isDirectory !== right.isDirectory) {
            return left.isDirectory ? -1 : 1;
        }
        const extensionResult = naturalCollator.compare(
            extensionOf(left.name),
            extensionOf(right.name),
        );
        return extensionResult || naturalCollator.compare(left.name, right.name);
    }

    if (mode === 'modified') {
        const timeResult = (right.modifiedTime ?? 0) - (left.modifiedTime ?? 0);
        return timeResult || naturalCollator.compare(left.name, right.name);
    }

    return naturalCollator.compare(left.name, right.name);
}

export function applyAuthoritativeOrder<T extends SortableEntry>(
    entries: readonly T[],
    order: readonly string[],
    fallbackMode: FallbackSort,
): T[] {
    const byName = new Map(entries.map((entry) => [entry.name, entry]));
    const emitted = new Set<string>();
    const unlisted = entries
        .filter((entry) => !order.includes(entry.name))
        .sort((left, right) => fallbackCompare(left, right, fallbackMode));

    const result: T[] = [];
    let wildcardEmitted = false;

    for (const token of order) {
        if (token === '*') {
            if (!wildcardEmitted) {
                result.push(...unlisted);
                unlisted.forEach((entry) => emitted.add(entry.name));
                wildcardEmitted = true;
            }
            continue;
        }

        const entry = byName.get(token);
        if (entry && !emitted.has(token)) {
            result.push(entry);
            emitted.add(token);
        }
    }

    if (!wildcardEmitted) {
        result.push(...unlisted.filter((entry) => !emitted.has(entry.name)));
    }

    for (const entry of entries) {
        if (!emitted.has(entry.name) && !result.includes(entry)) {
            result.push(entry);
        }
    }

    return result;
}

export function normalizeOrder(order: readonly string[]): string[] {
    const result: string[] = [];
    const seen = new Set<string>();

    for (const item of order) {
        const value = item.trim();
        if (!value || seen.has(value)) {
            continue;
        }
        result.push(value);
        seen.add(value);
    }

    return result.length ? result : ['*'];
}

export function insertBeforeWildcard(order: readonly string[], name: string): string[] {
    const normalized = normalizeOrder(order).filter((item) => item !== name);
    const wildcardIndex = normalized.indexOf('*');
    if (wildcardIndex < 0) {
        return [...normalized, name];
    }
    return [
        ...normalized.slice(0, wildcardIndex),
        name,
        ...normalized.slice(wildcardIndex),
    ];
}
