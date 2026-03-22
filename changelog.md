# Changelog

## 2026-02-16 (later)

- Restored **Import from OPML** button on the plugin settings tab (opens the same import modal as the command).

## 2026-02-16

- **Breaking:** Removed per-plugin custom templates (frontmatter/body stored in plugin settings).
- Import now uses Markdown files from the vault that live in the same folders configured for **core Templates** and/or **Templater** (deduplicated by path).
- Template dropdown is grouped by source; the selected `.md` file is read and `{{title}}`, `{{text}}`, etc. are substituted (Templater `<% %>` commands are not executed).
- Added `splitFrontmatter`, `applyOpmlPlaceholders`, and `vaultTemplateSources` helpers.
- Added Vitest unit tests (`npm test`) for frontmatter splitting and placeholder replacement.
- Bumped `@types/node` for Vitest compatibility; declared `opml` in `package.json` dependencies.
- Settings tab and import modal copy adjusted for Obsidian ESLint (sentence case); command name keeps “OPML” with a lint exception.
