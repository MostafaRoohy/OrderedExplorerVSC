# Ordered Explorer

Ordered Explorer is a native VS Code tree view that reproduces the high-value behaviors of the built-in File Explorer while adding **authoritative workspace-defined file ordering**.

The order is stored in the saved `.code-workspace` file under its `settings` object. Explicit entries are displayed exactly in the listed order, regardless of whether they are files or directories.

## Install a prebuilt VSIX

When you already have `ordered-explorer-0.2.0.vsix`, install it from VS Code:

1. Open **Extensions**.
2. Open the `...` menu.
3. Choose **Install from VSIX...**.
4. Select `ordered-explorer-0.2.0.vsix`.
5. Reload VS Code.

Or install it from a terminal opened in the directory containing the VSIX:

```bash
code --install-extension ./ordered-explorer-0.2.0.vsix
```

Use `--force` when reinstalling the same extension version after rebuilding it:

```bash
code --install-extension ./ordered-explorer-0.2.0.vsix --force
```

## Build a VSIX from source

You do not need to understand TypeScript or VS Code extension internals to build the package. The repository already contains the build and packaging scripts.

### Requirements

Install these tools first:

- [Node.js](https://nodejs.org/) **20 or newer**, including `npm`.
- [Visual Studio Code](https://code.visualstudio.com/) **1.125 or newer**.
- Git, when cloning the repository rather than downloading its source archive.

Confirm that Node.js and npm are available:

```bash
node --version
npm --version
```

### Build from a Git clone

```bash
git clone https://github.com/MostafaRoohy/OrderedExplorerVSC.git
cd OrderedExplorerVSC
npm ci
npm run package:vsix
```

`npm ci` installs the exact dependency versions recorded in `package-lock.json`. It is preferred over `npm install` for a clean clone and reproducible builds.

After the command succeeds, the generated package appears in the repository root:

```text
OrderedExplorerVSC/
└── ordered-explorer-0.2.0.vsix
```

Install that generated package with:

```bash
code --install-extension ./ordered-explorer-0.2.0.vsix
```

### Build from a downloaded source archive

Extract the archive, open a terminal in the extracted `OrderedExplorerVSC` directory, and run:

```bash
npm ci
npm run package:vsix
```

The result is the same `ordered-explorer-0.2.0.vsix` file in the project root.

### What the packaging command does

`npm run package:vsix` runs the local `@vscode/vsce` package. No global `vsce` installation is required.

Before creating the VSIX, the project automatically executes its `vscode:prepublish` pipeline:

```text
TypeScript type checking
        ↓
Unit tests
        ↓
esbuild production compilation
        ↓
VSIX packaging
```

In command form, that pipeline is:

```bash
npm run check-types
npm test
npm run compile
```

If any of those stages fail, packaging stops and no valid VSIX is produced.

### Compile without creating a VSIX

For a development build only:

```bash
npm ci
npm run compile
```

This creates the bundled extension program:

```text
dist/extension.js
```

`dist/extension.js` is build output, not the normal installable package. Run `npm run package:vsix` when you need a file that users can install.

### Run during extension development

Install dependencies and start the automatic compiler:

```bash
npm ci
npm run watch
```

Then open the repository in VS Code:

```bash
code .
```

Press **F5**. VS Code opens a separate **Extension Development Host** window running the development version of Ordered Explorer.

### Useful build commands

| Command | Purpose |
|---|---|
| `npm ci` | Install the locked dependency versions from `package-lock.json` |
| `npm run check-types` | Check TypeScript without producing build files |
| `npm test` | Run the unit tests |
| `npm run compile` | Build `dist/extension.js` once |
| `npm run watch` | Rebuild automatically after source changes |
| `npm run package:vsix` | Validate, compile, and create the installable VSIX |
| `npm run test:integration` | Run the Extension Host integration tests on Linux with `xvfb-run` |

### Common build problems

#### `node` or `npm` is not found

Install Node.js 20 or newer, close and reopen the terminal, and verify:

```bash
node --version
npm --version
```

#### `code` is not found

The VSIX was still built successfully. Install it through the VS Code interface using **Extensions → `...` → Install from VSIX...**.

On Linux and Windows, you can also enable the VS Code command-line launcher and then rerun the installation command.

#### Reinstalling does not appear to change the extension

When rebuilding version `0.2.0`, force the reinstall and reload VS Code:

```bash
code --install-extension ./ordered-explorer-0.2.0.vsix --force
```

For distributed releases, increment the `version` field in `package.json` before packaging a new release.

## Your workspace example

Workspace file:

```text
/home/work/Project_Something.code-workspace
```

Contents:

```jsonc
{
    "folders": [
        {
            "path": "./Project_Something"
        }
    ],

    "settings": {
        "orderedExplorer.order": [
            "file6",
            "file9",
            "dir3",
            "file2",
            "dir1",
            "*"
        ]
    }
}
```

The displayed root order is exactly:

```text
file6
file9
dir3
file2
dir1
<remaining unlisted entries>
```

Directories are **not** moved ahead of explicitly ordered files. The array is authoritative.

## Nested directory ordering

```jsonc
{
    "settings": {
        "orderedExplorer.order": [
            "README.md",
            "src",
            "test",
            "*"
        ],

        "orderedExplorer.directoryOrder": {
            "src": [
                "__init__.py",
                "config.py",
                "schema.py",
                "storage.py",
                "client.py",
                "app.py",
                "*"
            ],

            "src/services": [
                "base.py",
                "database.py",
                "network.py",
                "*"
            ]
        }
    }
}
```

Keys in `orderedExplorer.directoryOrder` are POSIX-style paths relative to the workspace root.

## The `*` token

`*` represents all currently unlisted files and folders.

```jsonc
"orderedExplorer.order": [
    "README.md",
    "src",
    "*",
    "test"
]
```

This means:

1. `README.md`
2. `src`
3. every unlisted item, using `orderedExplorer.fallbackSort`
4. `test`

Without `*`, unlisted resources are appended after all explicit entries. They are never hidden.

## Multi-root workspaces

Use `orderedExplorer.roots`, keyed by the workspace-folder display name:

```jsonc
{
    "folders": [
        { "name": "Backend",  "path": "./backend" },
        { "name": "Frontend", "path": "./frontend" }
    ],

    "settings": {
        "orderedExplorer.roots": {
            "Backend": {
                "order": ["README.md", "src", "test", "*"],
                "directoryOrder": {
                    "src": ["config.py", "database.py", "app.py", "*"]
                }
            },

            "Frontend": {
                "order": ["package.json", "src", "public", "*"]
            }
        }
    }
}
```

## Make it your primary Explorer

After installation, the Explorer sidebar contains both the original **Folders** view and **Ordered Explorer**.

Right-click the Explorer sidebar header, hide **Folders**, and keep **Ordered Explorer** enabled. VS Code remembers the view visibility.

## Fast file and folder creation

Use the **New File** button in the Ordered Explorer title bar, or double-click the workspace-root row. The same input creates both files and directories:

```text
report.py          → creates a file
src/services/      → creates a directory
src/api/client.py  → creates parent directories and then the file
```

A trailing `/` or `\` means **directory**. This makes a separate New Folder title-bar button unnecessary; the New Folder command remains available from a folder's context menu.

The stable VS Code `TreeView` API does not expose mouse events for completely blank whitespace. Therefore, the double-click target is the workspace-root row, which is the reliable native-tree surface available to extensions.

## Delete behavior

- **Delete** moves the selected files or folders to Trash when the filesystem supports it.
- **Shift+Delete** permanently deletes the selection with `useTrash: false`.
- Permanent deletion uses a modal warning when `orderedExplorer.confirmDelete` is enabled.

## Collapse and expand button

Ordered Explorer contributes one tree-state button:

- While folders are expanded, it shows **Collapse All**.
- After collapsing, it changes to a **+** button and runs **Expand All**.
- Workspace roots remain expanded; only their descendants are collapsed.
- Manually expanding a folder changes the button back to Collapse All.

## Implemented behaviors

- Native VS Code tree rendering, themes, extension icon, file icons, keyboard navigation and multi-selection.
- File opening and opening to the side.
- Workspace root and nested-directory ordering.
- Exact mixed file/directory order.
- Configurable fallback sorting.
- Live configuration refresh.
- Filesystem watching and targeted refresh.
- Active-editor auto-reveal.
- `files.exclude` filtering and an excluded-files toggle.
- Unified file/folder creation; a trailing slash creates a directory.
- Rename, move, duplicate, Trash/delete, permanent Shift+Delete, cut, copy and paste.
- Copy absolute and workspace-relative paths.
- Reveal in operating-system file manager.
- Open folder in integrated terminal.
- Compare two selected files.
- Drag files into folders.
- Drag a file before another file in the same directory to reorder it.
- Move up/down/top/bottom and place-before/after commands.
- Capture, reset and clean directory orders.
- Automatic order metadata updates after extension-driven rename, move and delete operations.
- Local, Remote SSH, WSL, Dev Container and virtual-filesystem access through `vscode.workspace.fs`.

## Reordering commands

Right-click an item and use:

- **Move Up in Custom Order**
- **Move Down in Custom Order**
- **Move to Top of Custom Order**
- **Move to Bottom of Custom Order**
- **Place Before...**
- **Place After...**
- **Remove Custom Position**

Right-click a directory and use:

- **Capture Current Directory Order**
- **Reset Directory Order**
- **Clean Stale Order Entries**

`Alt+Up` and `Alt+Down` work while the Ordered Explorer tree has focus.

## Settings

| Setting | Purpose |
|---|---|
| `orderedExplorer.order` | Root order for a single-root workspace |
| `orderedExplorer.directoryOrder` | Nested-directory order map |
| `orderedExplorer.roots` | Per-root order for multi-root workspaces |
| `orderedExplorer.fallbackSort` | Sorting for `*` and unlisted items |
| `orderedExplorer.autoReveal` | Reveal the active editor file |
| `orderedExplorer.showExcludedFiles` | Ignore or apply `files.exclude` |
| `orderedExplorer.confirmDelete` | Confirm before Trash or permanent deletion |
| `orderedExplorer.followSymlinks` | Expand directory symbolic links |

## Development notes

The extension is written in TypeScript, bundled with esbuild, tested with Vitest, and packaged with the repository-local `@vscode/vsce` dependency.

Generated directories and packages such as `node_modules/`, `dist/`, `.vscode-test/`, and `*.vsix` should remain outside Git. Commit the source code, tests, configuration, documentation, `package.json`, and `package-lock.json`.

## Important limitation

VS Code does not expose a supported API for replacing `workbench.explorer.fileView`. Ordered Explorer is therefore a separate native `TreeView` in the same Explorer container. See `docs/PARITY_MATRIX.md` and `docs/KNOWN_LIMITATIONS.md`.
