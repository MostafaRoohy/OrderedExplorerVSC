# Installation

## Ready-to-use VSIX

### VS Code UI

1. Open Extensions.
2. Select the `...` menu.
3. Select **Install from VSIX...**.
4. Select `ordered-explorer-0.2.0.vsix`.
5. Reload VS Code.

### Local PC terminal

```bash
code --install-extension ordered-explorer-0.2.0.vsix
```

To uninstall:

```bash
code --uninstall-extension mostafaroohy-local.ordered-explorer
```

## Source development

Prerequisites:

- Node.js 20 or newer.
- npm.
- VS Code.

Commands:

```bash
npm install
npm run check-types
npm test
npm run compile
npm run package:vsix
```

Press `F5` in the extension project to launch an Extension Development Host during development.
