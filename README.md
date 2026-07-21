# Ordered Explorer

Ordered Explorer is a native VS Code tree view that reproduces the high-value behaviors of the built-in File Explorer while adding **authoritative workspace-defined file ordering**.

The order is stored in the saved `.code-workspace` file under its `settings` object. Explicit entries are displayed exactly in the listed order, regardless of whether they are files or directories.

## Install a prebuilt VSIX

When you already have `ordered-explorer-0.7.0.vsix`, install it from VS Code:

1. Open **Extensions**.
2. Open the `...` menu.
3. Choose **Install from VSIX...**.
4. Select `ordered-explorer-0.7.0.vsix`.
5. Reload VS Code.

Or install it from a terminal opened in the directory containing the VSIX:

```bash
code --install-extension ./ordered-explorer-0.7.0.vsix
```

Use `--force` when reinstalling the same extension version after rebuilding it:

```bash
code --install-extension ./ordered-explorer-0.7.0.vsix --force
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
└── ordered-explorer-0.7.0.vsix
```

Install that generated package with:

```bash
code --install-extension ./ordered-explorer-0.7.0.vsix
```

### Build from a downloaded source archive

Extract the archive, open a terminal in the extracted `OrderedExplorerVSC` directory, and run:

```bash
npm ci
npm run package:vsix
```

The result is the same `ordered-explorer-0.7.0.vsix` file in the project root.

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

When rebuilding version `0.7.0`, force the reinstall and reload VS Code:

```bash
code --install-extension ./ordered-explorer-0.7.0.vsix --force
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

Use the **New File** button in the Ordered Explorer title bar or the **New File...** command on a folder's context menu. The same input creates both files and directories:

```text
report.py          → creates a file
src/services/      → creates a directory
src/api/client.py  → creates parent directories and then the file
```

A trailing `/` or `\` means **directory**. This makes a separate New Folder title-bar button unnecessary; the New Folder command remains available from a folder's context menu.

Blank-space double-click creation is intentionally not implemented. The stable VS Code `TreeView` API does not expose pointer events for unused tree whitespace, and the previous synthetic creation row was removed because it added permanent visual clutter.

## Delete behavior

- **Delete** moves the selected files or folders to Trash when the filesystem supports it.
- **Shift+Delete** permanently deletes the selection with `useTrash: false`.
- Each confirmation dialog includes **Don't Ask Again**. Choosing it performs the current deletion and disables future prompts for that deletion type.
- Trash and permanent deletion use separate settings, so disabling the ordinary Delete prompt does not disable the Shift+Delete warning.

## Collapse button

Ordered Explorer contributes one **Collapse All** button:

- It collapses directory descendants only.
- Workspace roots are immediately restored to their expanded state.
- There is no Expand All action because recursively opening every directory is visually chaotic and unnecessarily expensive.


## Context-menu appearance

Ordered Explorer uses submenus and emoji-prefixed labels by default:

```jsonc
{
    "orderedExplorer.contextMenu.useSubmenus": true,
    "orderedExplorer.contextMenu.useEmojiTitles": true
}
```

With submenus enabled, the right-click menu is organized as:

```text
↗️ Open to the Side
⚖️ Git Diff Selected

────────────────────────

📄 New File...
📁 New Folder...
✏️ Rename...
📑 Duplicate
🚚 Move To...
🗑️ Delete
⚠️ Delete Permanently

────────────────────────

🛠️ Open In  ›
    📂 Open in File Explorer
    💻 Open in Integrated Terminal

────────────────────────

📋 Clipboard  ›
    📋 Copy
    ✂️ Cut
    📥 Paste
    🔗 Copy Absolute Path
    🧭 Copy Relative Path
    🤖 Copy Content to Clipboard
    🌳 Copy Hierarchy to Clipboard

────────────────────────

↕️ Order  ›
    ⬆️ Move Up
    ⬇️ Move Down
    ⏫ Move to Top
    ⏬ Move to Bottom
    ⬅️ Place Before...
    ➡️ Place After...
    🧹 Remove Custom Position
```

With submenus disabled, the same commands use a flat five-section layout:

```text
↗️ Open to the Side

────────────────────────

📄 New File...
📁 New Folder...
✏️ Rename...
📑 Duplicate
🚚 Move To...
🗑️ Delete
⚠️ Delete Permanently
⚖️ Git Diff Selected

────────────────────────

📋 Copy
✂️ Cut
📥 Paste
🔗 Copy Absolute Path
🧭 Copy Relative Path
🤖 Copy Content to Clipboard
🌳 Copy Hierarchy to Clipboard

────────────────────────

📂 Open in File Explorer
💻 Open in Integrated Terminal

────────────────────────

⬆️ Move Up
⬇️ Move Down
⏫ Move to Top
⏬ Move to Bottom
⬅️ Place Before...
➡️ Place After...
🧹 Remove Custom Position
```

VS Code does not expose blank spacer rows for native context menus, so the flat layout uses separators only at major section boundaries.

The four supported combinations remain:

| Submenus | Emoji titles | Result |
|---:|---:|---|
| On | On | Grouped menu with emoji labels |
| On | Off | Grouped menu with plain labels |
| Off | On | Flat menu with emoji-prefixed commands |
| Off | Off | Flat menu with plain command labels |

Changing either setting updates the menu without recompiling the extension.

## Implemented behaviors

- Native VS Code tree rendering, themes, extension icon, file icons, keyboard navigation and multi-selection.
- File opening and opening to the side.
- Workspace root and nested-directory ordering.
- Exact mixed file/directory order.
- Configurable fallback sorting.
- Live configuration refresh.
- Filesystem watching and targeted refresh.
- Active-editor auto-reveal while Ordered Explorer is already visible, preventing Source Control and other sidebar views from being replaced.
- `files.exclude` filtering and an excluded-files toggle.
- Unified file/folder creation; a trailing slash creates a directory.
- Rename, move, duplicate, Trash/delete, permanent Shift+Delete, cut, copy and paste.
- Copy absolute and workspace-relative paths.
- Reveal in operating-system file manager.
- Open folder in integrated terminal.
- Git diff two selected files.
- Drag files into folders.
- Drag a file before another file in the same directory to reorder it.
- Move up/down/top/bottom and place-before/after commands.
- Automatic order metadata updates after extension-driven rename, move and delete operations.
- Local, Remote SSH, WSL, Dev Container and virtual-filesystem access through `vscode.workspace.fs`.

## Reordering commands

Right-click a file or directory and open **Order** when submenus are enabled:

- **Move Up**
- **Move Down**
- **Move to Top**
- **Move to Bottom**
- **Place Before...**
- **Place After...**
- **Remove Custom Position**

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
| `orderedExplorer.confirmTrashDelete` | Confirm before moving resources to Trash |
| `orderedExplorer.confirmPermanentDelete` | Confirm before permanent deletion |
| `orderedExplorer.confirmDelete` | Deprecated shared fallback for older workspaces |
| `orderedExplorer.followSymlinks` | Expand directory symbolic links |
| `orderedExplorer.contextMenu.useSubmenus` | Group related right-click actions into submenus |
| `orderedExplorer.contextMenu.useEmojiTitles` | Prefix right-click menu titles with emoji symbols |

## Development notes

The extension is written in TypeScript, bundled with esbuild, tested with Vitest, and packaged with the repository-local `@vscode/vsce` dependency.

Generated directories and packages such as `node_modules/`, `dist/`, `.vscode-test/`, and `*.vsix` should remain outside Git. Commit the source code, tests, configuration, documentation, `package.json`, and `package-lock.json`.

## Important limitation

VS Code does not expose a supported API for replacing `workbench.explorer.fileView`. Ordered Explorer is therefore a separate native `TreeView` in the same Explorer container. See `docs/PARITY_MATRIX.md` and `docs/KNOWN_LIMITATIONS.md`.

## AI context copying

Right-click a file, folder, workspace root, or multi-selection inside **Ordered Explorer**. With the default submenu layout, open **📋 Clipboard**, then choose:

- **Copy Content to Clipboard** — copies the selected project structure followed by the contents of readable text files in Markdown code blocks.
- **Copy Hierarchy to Clipboard** — copies only the selected structure as a text tree.

The generated tree follows Ordered Explorer's authoritative custom order and respects the files currently visible through its exclusion rules. Binary files are represented by a placeholder, and files larger than 1 MiB are omitted from content copying.

These focused commands are independently implemented in Ordered Explorer and are inspired by the MIT-licensed [Copy4AI](https://github.com/LeonKohli/copy4ai) extension.


## Third-party notices

Ordered Explorer is implemented against the public Visual Studio Code Extension API.

Visual Studio Code is Copyright (c) Microsoft Corporation and is distributed under the MIT License in its open-source repository. No private Visual Studio Code Workbench modules are bundled in this extension.

The project uses `minimatch`, `esbuild`, TypeScript, Vitest, and `@vscode/vsce` under their respective licenses as declared in `package-lock.json` and their package metadata.

### Copy4AI inspiration

The context-menu labels and user-facing behavior of the AI-copying commands were inspired by [Copy4AI](https://github.com/LeonKohli/copy4ai) by Leon Kohli, licensed under the MIT License.

Ordered Explorer's implementation was written independently and does not bundle Copy4AI.

