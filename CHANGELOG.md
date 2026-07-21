# Changelog

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
