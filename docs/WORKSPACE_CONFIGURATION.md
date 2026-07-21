# Workspace configuration

Ordered Explorer uses contributed VS Code settings. In a saved workspace, `ConfigurationTarget.Workspace` causes VS Code to persist these settings inside the `.code-workspace` file.

Do not place `explorer_order` as an unknown top-level property. Use the `settings` object:

```jsonc
{
    "folders": [
        { "path": "./Project_Something" }
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

## Ordering contract

The array represents final visual order:

- Entries are case-sensitive on case-sensitive filesystems.
- The first duplicate wins.
- Missing entries are ignored.
- `*` inserts all unlisted entries at that exact position.
- Without `*`, unlisted entries appear at the end.
- Explicit files and directories are never regrouped.

## Operation synchronization

Operations initiated through Ordered Explorer update the workspace ordering:

- Rename replaces the old name and rewrites nested directory keys.
- Move removes the source entry and inserts the destination entry.
- Delete removes the entry and descendant directory maps.
- Duplicate inserts the copy after the original when possible.

External filesystem operations are detected and refreshed, but an external rename cannot always be distinguished from an unrelated delete plus create. Stale names remain harmless and can be removed with **Clean Stale Order Entries**.

## Context-menu presentation

The right-click menu has two independent presentation settings:

```jsonc
{
    "orderedExplorer.contextMenu.useSubmenus": true,
    "orderedExplorer.contextMenu.useEmojiTitles": true
}
```

- `useSubmenus` groups related commands under **ClipBoard**, **Custom Order**, and **Manage**.
- `useEmojiTitles` prefixes both direct command labels and submenu labels with emoji symbols.
- Disabling both settings restores a flat, plain-text context menu.

These are window-scoped VS Code settings and may be stored in user settings or workspace settings.

