# Ordered Explorer

Ordered Explorer is a native VS Code tree view that reproduces the high-value behaviors of the built-in File Explorer while adding **authoritative workspace-defined file ordering**.

The order is stored in the saved `.code-workspace` file under its `settings` object. Explicit entries are displayed exactly in the listed order, regardless of whether they are files or directories.

## Install

Install the packaged VSIX from VS Code:

1. Open **Extensions**.
2. Open the `...` menu.
3. Choose **Install from VSIX...**.
4. Select `ordered-explorer-0.1.0.vsix`.
5. Reload VS Code.

Or install from a terminal:

```bash
code --install-extension ordered-explorer-0.1.0.vsix
```

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

## Implemented behaviors

- Native VS Code tree rendering, themes, file icons, keyboard navigation and multi-selection.
- File opening and opening to the side.
- Workspace root and nested-directory ordering.
- Exact mixed file/directory order.
- Configurable fallback sorting.
- Live configuration refresh.
- Filesystem watching and targeted refresh.
- Active-editor auto-reveal.
- `files.exclude` filtering and an excluded-files toggle.
- New file and folder creation.
- Rename, move, duplicate, Trash/delete, cut, copy and paste.
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
| `orderedExplorer.confirmDelete` | Confirm before Trash/delete |
| `orderedExplorer.followSymlinks` | Expand directory symbolic links |

## Development

```bash
npm install
npm run check-types
npm test
npm run compile
npm run test:integration  # downloads VS Code for an Extension Host smoke test
npm run package:vsix
```

The extension is bundled with esbuild and packaged with `@vscode/vsce`.

## Important limitation

VS Code does not expose a supported API for replacing `workbench.explorer.fileView`. Ordered Explorer is therefore a separate native `TreeView` in the same Explorer container. See `docs/PARITY_MATRIX.md` and `docs/KNOWN_LIMITATIONS.md` in the source package.
