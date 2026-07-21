import { describe, expect, it } from 'vitest';
import {
    applyAuthoritativeOrder,
    fallbackCompare,
    insertBeforeWildcard,
    normalizeOrder,
    type SortableEntry,
} from '../src/ordering/sorter';

interface Entry extends SortableEntry {
    readonly id: number;
}

const entry = (
    id: number,
    name: string,
    isDirectory: boolean = false,
    modifiedTime: number | undefined = undefined,
): Entry => ({ id, name, isDirectory, modifiedTime });

describe('applyAuthoritativeOrder', () => {
    it('uses the configured array as the final mixed file/folder order', () => {
        const entries = [
            entry(1, 'file2'),
            entry(2, 'dir1', true),
            entry(3, 'file6'),
            entry(4, 'dir3', true),
            entry(5, 'file9'),
        ];

        const result = applyAuthoritativeOrder(
            entries,
            ['file6', 'file9', 'dir3', 'file2', 'dir1'],
            'default',
        );

        expect(result.map((item) => item.name)).toEqual([
            'file6',
            'file9',
            'dir3',
            'file2',
            'dir1',
        ]);
    });

    it('inserts unlisted entries exactly at the wildcard', () => {
        const entries = [
            entry(1, 'src', true),
            entry(2, 'README.md'),
            entry(3, 'alpha.py'),
            entry(4, 'beta.py'),
            entry(5, 'test', true),
        ];

        const result = applyAuthoritativeOrder(
            entries,
            ['README.md', 'src', '*', 'test'],
            'mixed',
        );

        expect(result.map((item) => item.name)).toEqual([
            'README.md',
            'src',
            'alpha.py',
            'beta.py',
            'test',
        ]);
    });

    it('appends unlisted entries when no wildcard exists', () => {
        const entries = [entry(1, 'b'), entry(2, 'a'), entry(3, 'first')];
        const result = applyAuthoritativeOrder(entries, ['first'], 'mixed');
        expect(result.map((item) => item.name)).toEqual(['first', 'a', 'b']);
    });

    it('ignores stale names and duplicate order entries', () => {
        const entries = [entry(1, 'a'), entry(2, 'b')];
        const result = applyAuthoritativeOrder(
            entries,
            ['missing', 'b', 'b', '*'],
            'mixed',
        );
        expect(result.map((item) => item.name)).toEqual(['b', 'a']);
    });
});

describe('fallbackCompare', () => {
    it('supports folders-first default sorting', () => {
        const values = [entry(1, 'z.py'), entry(2, 'src', true), entry(3, 'a.py')];
        expect(values.sort((a, b) => fallbackCompare(a, b, 'default')).map((x) => x.name))
            .toEqual(['src', 'a.py', 'z.py']);
    });

    it('supports true mixed sorting', () => {
        const values = [entry(1, 'z.py'), entry(2, 'src', true), entry(3, 'a.py')];
        expect(values.sort((a, b) => fallbackCompare(a, b, 'mixed')).map((x) => x.name))
            .toEqual(['a.py', 'src', 'z.py']);
    });

    it('supports modified-time sorting', () => {
        const values = [entry(1, 'old', false, 10), entry(2, 'new', false, 20)];
        expect(values.sort((a, b) => fallbackCompare(a, b, 'modified')).map((x) => x.name))
            .toEqual(['new', 'old']);
    });
});

describe('order normalization', () => {
    it('removes empty and duplicate entries while preserving first occurrence', () => {
        expect(normalizeOrder([' a ', '', 'a', '*', '*', 'b'])).toEqual(['a', '*', 'b']);
    });

    it('inserts an item before wildcard', () => {
        expect(insertBeforeWildcard(['a', '*', 'z'], 'b')).toEqual(['a', 'b', '*', 'z']);
    });
});
