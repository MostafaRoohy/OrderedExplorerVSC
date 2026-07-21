# Known limitations

## Separate Explorer view

The extension contributes `orderedExplorer.files` inside the standard Explorer container. It cannot replace the private built-in view ID `workbench.explorer.fileView` through supported APIs.

Hide the original **Folders** view to use Ordered Explorer as the primary tree.

## Blank-space double-click events

The stable `TreeView` API does not expose pointer or double-click events for completely blank whitespace. Commands on collapsible root rows are also not reliable for this gesture. Ordered Explorer therefore adds a non-collapsible creation-surface row directly beneath each workspace root. Double-clicking that row opens the unified file/folder input while preserving the native tree implementation.

## Rename user interface

Rename uses `showInputBox`. VS Code does not expose the built-in Explorer's inline editable tree row.

## Drag placement

The public drag/drop API reports the target tree item but not whether the pointer is above or below its midpoint. Ordered Explorer uses deterministic semantics:

- Drop on a file in the same directory: place dragged items before that file.
- Drop on a directory: move dragged items into that directory.
- Use Place Before/After commands for explicit placement.

## Compact folders and file nesting

Version 0.3.0 does not compress one-child folder chains or apply `explorer.fileNesting.patterns`. Implementing these in a custom tree is possible, but it changes parentage, selection, operation targets and reveal behavior. They are intentionally excluded until they can be added without weakening file-operation correctness.

## Extension-managed clipboard

Cut/copy/paste state belongs to Ordered Explorer. It does not read the private clipboard state of the built-in Explorer.

## External rename inference

Filesystem watchers report create/delete/change. An external rename may appear as delete plus create, so the old order entry can become stale. Stale entries do not affect rendering and can be cleaned through the context menu.

## Workspace setting location

For a saved `.code-workspace`, settings are written to that workspace file. For a single folder opened without a saved workspace, VS Code writes workspace settings to `.vscode/settings.json` because no `.code-workspace` file exists.
