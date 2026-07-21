import { describe, expect, it } from 'vitest';
import { languageForPath, looksBinary, renderTree } from '../src/services/aiCopyFormat';

describe('AI copy helpers', () => {
    it('renders a deterministic tree', () => {
        expect(renderTree([
            {
                name: 'src',
                isDirectory: true,
                children: [
                    { name: 'app.ts', isDirectory: false, children: [] },
                    { name: 'util', isDirectory: true, children: [] },
                ],
            },
            { name: 'README.md', isDirectory: false, children: [] },
        ])).toBe([
            'src/',
            '├── app.ts',
            '└── util/',
            'README.md',
        ].join('\n'));
    });

    it('detects null-containing binary data', () => {
        expect(looksBinary(new Uint8Array([65, 66, 0, 67]))).toBe(true);
        expect(looksBinary(new TextEncoder().encode('normal text'))).toBe(false);
    });

    it('maps common language identifiers', () => {
        expect(languageForPath('src/app.ts')).toBe('typescript');
        expect(languageForPath('script.py')).toBe('python');
        expect(languageForPath('README.md')).toBe('md');
    });
});
