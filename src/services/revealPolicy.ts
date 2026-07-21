export function mayRevealTree(
    treeViewVisible: boolean,
    allowViewActivation: boolean,
): boolean {
    return allowViewActivation || treeViewVisible;
}
