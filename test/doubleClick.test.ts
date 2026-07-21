import { describe, expect, it } from 'vitest';
import { DoubleClickTracker } from '../src/services/doubleClick';

describe('DoubleClickTracker', () => {
    it('activates only after two clicks on the same surface within the threshold', () => {
        let time = 1_000;
        const tracker = new DoubleClickTracker(650, () => time);

        expect(tracker.activate('surface-a')).toBe(false);
        time += 300;
        expect(tracker.activate('surface-a')).toBe(true);
    });

    it('does not combine clicks from different surfaces', () => {
        let time = 1_000;
        const tracker = new DoubleClickTracker(650, () => time);

        expect(tracker.activate('surface-a')).toBe(false);
        time += 200;
        expect(tracker.activate('surface-b')).toBe(false);
    });

    it('does not activate after the threshold expires', () => {
        let time = 1_000;
        const tracker = new DoubleClickTracker(650, () => time);

        expect(tracker.activate('surface-a')).toBe(false);
        time += 651;
        expect(tracker.activate('surface-a')).toBe(false);
    });
});
