import { describe, expect, it } from 'vitest';
import { parseResourceCreationInput } from '../src/services/resourceInput';

describe('parseResourceCreationInput', () => {
    it('treats a normal path as a file', () => {
        expect(parseResourceCreationInput('src/app.ts')).toEqual({
            kind: 'file',
            relativePath: 'src/app.ts',
        });
    });

    it('treats a trailing forward slash as a directory', () => {
        expect(parseResourceCreationInput('src/services/')).toEqual({
            kind: 'directory',
            relativePath: 'src/services',
        });
    });

    it('treats a trailing backslash as a directory', () => {
        expect(parseResourceCreationInput('src\\services\\')).toEqual({
            kind: 'directory',
            relativePath: 'src\\services',
        });
    });
});
