# Changelog

## 2026-02-16 (coverage)

- Added unit tests for `opmlOutlines`, `buildNoteContent`, `parseOpml`, `vaultTemplateSources`, `settings` tab, and `main` plugin lifecycle; refactored import logic into pure modules for testability.
- Vitest coverage (`@vitest/coverage-v8`): `npm run test:coverage` — HTML report at `coverage/index.html`, thresholds ≥90% lines/statements (UI `importModal` and type-only files excluded from coverage scope).
- Vitest resolves `obsidian` to `src/test/obsidian-stub.ts` so tests run in Node without Electron.

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
