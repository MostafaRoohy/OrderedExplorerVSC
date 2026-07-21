# Explorer parity matrix

Status definitions:

- **Implemented**: available through stable public VS Code APIs.
- **Partial**: behavior is useful but cannot be identical to private Workbench behavior.
- **Unavailable**: no stable extension API exists.

| Native Explorer behavior | Status | Ordered Explorer implementation |
|---|---|---|
| Native tree styling and themes | Implemented | VS Code `TreeView` renderer |
| Active file-icon theme | Implemented | `TreeItem.resourceUri` |
| Git/resource decorations | Implemented by host | Resource URI is supplied to VS Code |
| Expand/collapse | Implemented | One Collapse All action; roots stay expanded |
| Persistent expansion and selection | Implemented by host | Stable `TreeItem.id` values |
| Multi-selection | Implemented | `canSelectMany` |
| Keyboard navigation | Implemented | Native `TreeView` behavior |
| Open file | Implemented | `vscode.open` |
| Open to side | Implemented | `vscode.open` with side column |
| Auto-reveal active file | Implemented | Reveals only while Ordered Explorer is visible; explicit reveal may activate the view |
| Refresh and file watching | Implemented | `FileSystemWatcher` plus targeted refresh |
| Multi-root workspace | Implemented | Per-root configuration |
| Remote and virtual filesystems | Implemented | `vscode.workspace.fs` |
| `files.exclude` | Implemented | Glob-based filtering |
| Show excluded files | Implemented | Workspace setting toggle |
| Create file/folder | Implemented | Unified input; trailing slash creates a directory |
| Rename | Partial | Input box; public API has no inline row editor |
| Trash/delete | Implemented | Delete uses Trash; Shift+Delete is permanent |
| Move, duplicate and copy | Implemented | Workspace filesystem API |
| Cut/copy/paste | Implemented | Extension-managed clipboard |
| Compare selected | Implemented | `vscode.diff` |
| Reveal in OS | Implemented | Built-in command |
| Open in terminal | Implemented | Terminal with resource URI cwd |
| Drag into folder | Implemented | Tree drag/drop controller |
| Drag reordering | Partial | Drop on file means place before target |
| Exact native insertion indicator | Unavailable | Target item is exposed, pointer geometry is not |
| Authoritative custom order | Implemented | Workspace settings and deterministic sorter |
| Configurable context-menu submenus and emoji titles | Implemented | `config.*` when clauses select grouped/flat and emoji/plain manifest entries |
| Order metadata synchronization | Implemented | Extension-driven rename/move/delete |
| Blank-area double-click | Unavailable | Public TreeView exposes no blank-surface event; no synthetic placeholder row is added |
| Compact folders | Unavailable in v0.5.0 | Public tree can simulate it, but exact native semantics require a separate model layer |
| File nesting | Unavailable in v0.5.0 | Planned; native Explorer nesting rules are not exposed as a reusable API |
| Inline rename control | Unavailable | Private Workbench editor |
| Native Explorer clipboard state | Unavailable | Private Explorer service |
| Replace `workbench.explorer.fileView` | Unavailable | VS Code permits only contributed views |
| Third-party menus targeting native Explorer ID | Unavailable | Those extensions do not target custom tree views |

## Release criterion used for v0.5.0

The extension is usable as a primary explorer for routine project work and implements the complete custom-order contract. It does not claim internal one-for-one parity where VS Code exposes no stable API.
