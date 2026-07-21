# Ordered Explorer v0.7.0 Verification

## Result

The v0.7.0 source and packaged VSIX passed the available static, unit, build, and package checks.

## Checks completed

- TypeScript type checking: passed.
- Vitest test files: 5 passed.
- Vitest unit tests: 27 passed.
- Production esbuild compilation: passed.
- VSIX packaging with `@vscode/vsce`: passed.
- Packaged manifest version: `0.7.0`.
- Packaged submenu labels: validated.
- Packaged submenu command order: validated.
- Packaged concise clipboard and order labels: validated.
- Packaged README menu documentation: validated.

## Menu behavior verified

### Submenus enabled

1. Open to the Side and Git Diff Selected.
2. File and directory operations.
3. Open In submenu.
4. Clipboard submenu.
5. Order submenu.

### Submenus disabled

1. Open to the Side.
2. File and directory operations, followed by Git Diff Selected.
3. Clipboard actions.
4. Open-in actions.
5. Ordering actions.

The flat menu uses native separators at major section boundaries. VS Code does not support noninteractive blank spacer rows in contributed context menus.

## Integration test note

A VS Code Extension Host integration run was not performed because this runtime could not resolve the external VS Code/GitHub download hosts. The failure was environmental and occurred before extension activation.
