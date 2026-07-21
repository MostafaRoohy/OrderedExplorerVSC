import { describe, expect, it } from 'vitest';
import { mayRevealTree } from '../src/services/revealPolicy';

describe('mayRevealTree', () => {
    it('allows automatic reveal while Ordered Explorer is visible', () => {
        expect(mayRevealTree(true, false)).toBe(true);
    });

    it('blocks automatic reveal while Ordered Explorer is hidden', () => {
        expect(mayRevealTree(false, false)).toBe(false);
    });

    it('allows an explicit reveal command to activate the view', () => {
        expect(mayRevealTree(false, true)).toBe(true);
    });
});
