import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTests } from '@vscode/test-electron';

const root = path.dirname(fileURLToPath(import.meta.url));

try {
    await runTests({
        version: '1.129.1',
        extensionDevelopmentPath: root,
        extensionTestsPath: path.join(root, 'test', 'integration', 'index.js'),
        launchArgs: [
            path.join(root, '.vscode-test', 'Project_Something.code-workspace'),
            '--disable-extensions',
            '--disable-gpu',
        ],
    });
} catch (error) {
    console.error(error);
    process.exit(1);
}
