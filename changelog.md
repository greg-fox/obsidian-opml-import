# Changelog

## 2026-11-06 (store readiness)

- **Added:** `{{date}}`, `{{time}}`, `{{date:FORMAT}}`, and `{{time:FORMAT}}` placeholders, matching the core Templates plugin. Default formats come from the core Templates settings; all notes in one import share a timestamp.
- **Added:** The import dialog warns when the selected template contains Templater commands (`<% %>`), which are not run during import.
- **Added:** The settings tab implements `getSettingDefinitions()`, so its rows appear in Obsidian's settings search on 1.13.0 and later. `display()` remains as the fallback for older versions, built from the same rows.
- **Fixed:** Windows device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`-`COM9`, `LPT1`-`LPT9`, with or without an extension) get an underscore so the note can be created on Windows.
- **Fixed:** Placeholders written with spaces inside the braces (`{{ xmlUrl }}`) were left in the note unchanged. In frontmatter, Obsidian then rewrote the leftover text as a nested property (`url:` followed by `"{ xmlUrl }":`). Spaces are now allowed.
- **Changed:** The README example template quotes its frontmatter placeholders, with a note on why: unquoted placeholders are not valid YAML, so the Properties view rewrites them.
- **Fixed:** A destination folder that differs only in case from an existing folder (`Podcasts` when the vault has `podcasts`) made the import fail with "Folder already exists" on macOS and Windows. The destination now uses the existing folder's casing.
- **Fixed:** The import dialog sets its title with `titleEl` instead of `Modal.setTitle()`, which is not in the 1.4.x API, so `minAppVersion` 1.4.0 is accurate. Verified by type-checking against the Obsidian 1.4.0 typings.
- **Fixed:** `version-bump.mjs` always records the new version in `versions.json`. Previously it skipped the entry when `minAppVersion` was unchanged, which made the release workflow fail.
- Upgraded `eslint-plugin-obsidianmd` to 0.5.0 and the `obsidian` typings to 1.14.4; removed the `eslint-disable` comments the new rules forbid and added `eslint.config.mts` to the ESLint project service.
- `tsconfig.json` now targets the ES2019 library (`trimStart` / `trimEnd`).
- Added a screenshot of the import dialog to the README.

## 2026-11-05 (store preparation)

- **Changed:** Template folders are now read from the saved settings of the core Templates plugin and Templater (`core-plugins.json`, `templates.json`, `community-plugins.json`, and Templater's `data.json` in the vault's config folder) instead of through undocumented `app.internalPlugins` / `app.plugins` objects. The config folder comes from `Vault#configDir`, so renamed config folders work.
- **Changed:** Checking whether a note name is taken uses the Vault API instead of `vault.adapter.exists`, and ignores case so a new `show.md` is never created next to an existing `Show.md`.
- **Changed:** `obsidian` moved to `devDependencies` and pinned to 1.10.3.
- Added a GitHub Actions release workflow: pushing a tag that matches `manifest.json`'s version runs lint, tests, and the build, then creates a draft release with `main.js`, `manifest.json`, and `styles.css`. CI now also runs the tests.
- `LICENSE` now names Greg Fox; removed the empty `fundingUrl` from `manifest.json`.

## 2026-11-05

- **Fixed:** URLs in frontmatter lost their colons (`https//...`). Frontmatter values are now written as quoted YAML strings, with escaping for values inside existing quotes, flow lists, and block scalars.
- **Fixed:** Container outlines (such as `feeds` in an Overcast export) were imported as notes. Outlines with children and no `xmlUrl` are now skipped; their children are still imported.
- **Fixed:** Duplicate note names produced `X-1`, `X-1-2`, `X-2-3`. Duplicates are now `X 1`, `X 2`, `X 3`.
- **Fixed:** Placeholders were substituted in sequence, so a value containing `{{xmlUrl}}` was replaced again. Substitution is now a single pass.
- **Fixed:** Note names now also drop `#`, `^`, `[`, `]`, and leading dots, and paths go through `normalizePath`.
- **Fixed:** The template's spacing between frontmatter and body is preserved instead of gaining an extra blank line.
- **Changed:** Replaced the `opml` npm package with a `DOMParser`-based parser. The bundle shrinks from about 890 KB to about 14 KB and no longer pulls in Node built-ins, so the plugin can load on mobile.
- **Added:** The import dialog previews the number of notes, the destination, and the first few note names before importing.
- **Added:** A missing destination folder (and its parents) is created during import. A path that points at a file is rejected.
- **Changed:** The import dialog uses Obsidian's `Setting` components and `Modal.setTitle`; the Import button is disabled while an import runs.
- **Changed:** `minAppVersion` raised to 1.4.0 (`Vault.createFolder`).
- **Tests:** Added specs for the import dialog and note creation; tests run in happy-dom with an in-memory vault. `importModal.ts` is no longer excluded from coverage.
- Cleaned up `styles.css`: removed sample comments and unused rules, prefixed all classes, and switched to Obsidian spacing and radius variables.

## 2026-02-16 (coverage)

- Added unit tests for `opmlOutlines`, `buildNoteContent`, `parseOpml`, `vaultTemplateSources`, `settings` tab, and `main` plugin lifecycle; refactored import logic into pure modules for testability.
- Vitest coverage (`@vitest/coverage-v8`): `npm run test:coverage`: HTML report at `coverage/index.html`, thresholds ≥90% lines/statements (UI `importModal` and type-only files excluded from coverage scope).
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
