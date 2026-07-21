# Changelog

## 0.7.0 — 2026-07-21

- Reorganize the submenu layout into direct open/diff actions, filesystem actions, Open In, Clipboard, and Order sections.
- Reorganize the flat layout into five major separator groups without unsupported spacer rows.
- Rename Manage to Open In, ClipBoard to Clipboard, and Custom Order to Order.
- Rename Copy to Clipboard (Copy4AI) to Copy Content to Clipboard.
- Rename Copy Project Structure (Copy4AI) to Copy Hierarchy to Clipboard.
- Shorten custom-order command labels to Move Up, Move Down, Move to Top, and Move to Bottom.
- Use the requested balance-scale emoji for Git Diff Selected.

## 0.6.0 — 2026-07-21

- Reorder the item context menu into Open, New, Manage, workspace actions, ClipBoard, and Custom Order sections.
- Rename Clipboard & AI to ClipBoard.
- Rename Reveal in File Explorer to Open in File Explorer.
- Rename Compare Selected to Git Diff Selected.
- Rename Copy Path to Copy Absolute Path.
- Remove Capture Current Directory Order, Reset Directory Order, and Clean Stale Order Entries from commands and menus.

## 0.5.0 — 2026-07-21

- Group related right-click actions into configurable **ClipBoard**, **Custom Order**, and **Manage** submenus.
- Add configurable emoji-prefixed titles for right-click commands and submenu labels.
- Preserve a fully flat, plain-text context menu when both presentation settings are disabled.
- Hide emoji presentation aliases from the Command Palette while routing them to canonical commands.
- Add manifest tests for all context-menu presentation modes.
- Move third-party notices into `README.md` and remove the standalone notices file.

## 0.4.0 — 2026-07-21

- Add **Copy to Clipboard (Copy4AI)** to Ordered Explorer item context menus.
- Add **Copy Project Structure (Copy4AI)** to Ordered Explorer item context menus.
- Preserve Ordered Explorer custom ordering in generated project trees.
- Support file, folder, root, and multi-selection copying.
- Skip duplicate nested selections, detect binary content, and cap copied file content at 1 MiB.


## 0.3.1 — 2026-07-21

- Removed the synthetic **Double-click to create a file or folder** tree row.
- Removed the double-click tracker, creation-surface node state and associated tests.
- Retained unified file/folder creation through the New File toolbar and context-menu command.
- Prevented automatic active-file reveal from activating Ordered Explorer while another sidebar view is open.
- Preserved intentional view activation for the explicit **Reveal Active File** command.
- Prevented root-expansion maintenance from revealing a hidden Ordered Explorer view during startup.
- Added unit tests for automatic-versus-explicit reveal policy.

## 0.3.0 — 2026-07-21

- Removed the `+` Expand All action and retained one Collapse All toolbar button.
- Kept workspace roots expanded after collapsing their descendants.
- Replaced the unreliable workspace-root double-click command with a dedicated native creation-surface row.
- Added unit-tested double-click tracking for the creation surface.
- Added separate **Don't Ask Again** behavior for Trash deletion and permanent deletion.
- Added `orderedExplorer.confirmTrashDelete` and `orderedExplorer.confirmPermanentDelete` settings.
- Retained the old `orderedExplorer.confirmDelete` setting as a deprecated fallback for existing workspaces.
- Prevented file-operation and reorder context menus from appearing on the creation-surface row.

## 0.2.0 — 2026-07-21

- Added a packaged extension icon while retaining the monochrome Explorer view icon.
- Added double-click file/folder creation on the workspace-root row.
- Unified file and folder creation: a trailing `/` or `\` creates a directory.
- Removed the redundant New Folder button from the view title toolbar.
- Added permanent deletion through **Shift+Delete** and a dedicated context-menu command.
- Removed the duplicate native Collapse All button.
- Added a single state-aware Collapse All / `+` Expand All toolbar action.
- Kept workspace roots expanded when descendants are collapsed.
- Added unit tests for file-versus-directory input parsing.

## 0.1.0 — 2026-07-21

- Initial implementation.
- Added authoritative mixed file/directory ordering from workspace settings.
- Added nested and multi-root order configuration.
- Added native TreeView rendering, filesystem watching and auto-reveal.
- Added create, rename, Trash/delete, move, duplicate, cut/copy/paste and path commands.
- Added drag/drop, explicit reorder commands and automatic order metadata updates.
- Added exclusion filtering, remote filesystem support, tests and documentation.
