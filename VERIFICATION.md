# Verification — Ordered Explorer 0.3.0

Verification date: 2026-07-21

## Passed

- TypeScript type checking: `npm run check-types`
- Unit tests: `npm test`
  - test files: 3 passed
  - tests: 15 passed
- Production bundle: `npm run compile`
- VSIX packaging: `npm run package:vsix`
- VSIX archive integrity inspection
- Packaged manifest inspection:
  - manifest version: `0.3.0`
  - exactly one Collapse All command
  - no Expand All command
  - separate Trash and permanent-delete confirmation settings
  - deprecated shared confirmation setting retained as a fallback
- Package-lock scan found no environment-internal registry URLs.

## Extension Host integration test

The integration runner compiled the extension successfully, but could not download the VS Code test host because this environment could not resolve:

```text
update.code.visualstudio.com
```

The failure occurred before extension activation:

```text
getaddrinfo EAI_AGAIN update.code.visualstudio.com
```

The integration runner and committed fixture remain included in the source repository.

## Double-click behavior

The stable VS Code `TreeView` API does not expose pointer or double-click events for blank whitespace. Commands attached to collapsible workspace-root rows also proved unreliable for this gesture.

Version 0.3.0 therefore renders a dedicated non-collapsible creation-surface row directly beneath every workspace root. Its command runs on each click, and a unit-tested tracker opens the unified New File or Folder input after two clicks on the same row within 650 milliseconds.
