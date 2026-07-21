export class DoubleClickTracker {
    private previous: { id: string; at: number } | undefined;

    public constructor(
        private readonly thresholdMilliseconds: number = 650,
        private readonly now: () => number = Date.now,
    ) {}

    public activate(id: string): boolean {
        const current = this.now();
        const previous = this.previous;
        this.previous = { id, at: current };

        if (
            !previous
            || previous.id !== id
            || current - previous.at > this.thresholdMilliseconds
        ) {
            return false;
        }

        this.previous = undefined;
        return true;
    }
}
