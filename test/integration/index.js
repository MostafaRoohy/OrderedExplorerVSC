const assert = require('node:assert/strict');
const vscode = require('vscode');

suite('Ordered Explorer extension host smoke tests', () => {
    test('activates and registers its primary commands', async () => {
        const extension = vscode.extensions.getExtension('mostafaroohy-local.ordered-explorer');
        assert.ok(extension, 'Extension was not discovered by the Extension Host');
        await extension.activate();
        assert.equal(extension.isActive, true);

        const commands = await vscode.commands.getCommands(true);
        for (const command of [
            'orderedExplorer.refresh',
            'orderedExplorer.newFile',
            'orderedExplorer.rename',
            'orderedExplorer.moveUp',
            'orderedExplorer.cleanStaleOrder',
        ]) {
            assert.ok(commands.includes(command), `Missing command: ${command}`);
        }
    });

    test('reads authoritative ordering from the saved workspace', () => {
        assert.ok(vscode.workspace.workspaceFile, 'Expected a saved .code-workspace');
        const config = vscode.workspace.getConfiguration('orderedExplorer');
        assert.deepEqual(config.get('order'), [
            'file6',
            'file9',
            'dir3',
            'file2',
            'dir1',
            '*',
        ]);
        assert.deepEqual(config.get('directoryOrder').dir3, [
            'module5.py',
            'module2.py',
            '*',
        ]);
    });

    test('refresh command executes without an extension-host error', async () => {
        await vscode.commands.executeCommand('orderedExplorer.refresh');
    });
});
