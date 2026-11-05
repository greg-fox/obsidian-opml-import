# OPML Import

Import [OPML](https://opml.org/spec2.opml) outlines into Markdown notes in your [Obsidian](https://obsidian.md) vault.

## Features

- **Settings → Community plugins → OPML Import → Import from OPML**, or the command **Import outlines from OPML**: choose an OPML/XML file in the vault, a **template** (Markdown note from your [Templates](https://help.obsidian.md/Plugins/Templates) folder and/or [Templater](https://github.com/SilentVoid13/Templater) template folder), and a destination folder.
- Before importing, the dialog previews how many notes will be created, where, and the first few note names.
- Each outline entry becomes a note. Outlines that only group other outlines (for example, the `feeds` folder in an Overcast export or a category folder in a feed reader export) are skipped. An outline with an `xmlUrl` is always imported.
- Placeholders in the template are replaced: `{{title}}`, `{{text}}`, `{{xmlUrl}}`, `{{htmlUrl}}`, `{{type}}`, `{{created}}`, `{{category}}`. `{{title}}` falls back to `text` and `{{text}}` falls back to `title`.
- YAML frontmatter in the template is supported. Values are written as quoted YAML strings, so URLs and titles containing `:`, `#`, or quotes are kept intact. Values inside existing quotes or flow lists (`[a, {{type}}]`) are escaped for that context, and values inside `|` / `>` block scalars are inserted as-is.
- Existing notes are never overwritten. When a name is taken, a number is added: `Show.md`, `Show 1.md`, `Show 2.md`.
- The destination folder, including any missing parent folders, is created if it does not exist.
- Works on desktop and mobile. OPML is parsed with the built-in `DOMParser`, so the plugin has no runtime dependencies.
- **Templater** `<% ... %>` snippets are **not** run during import; only the placeholders above are substituted. Use a normal Markdown template for imports.

### Example template

```markdown
---
title: {{title}}
feed: {{xmlUrl}}
website: {{htmlUrl}}
tags: [podcast]
---

# {{title}}

[Website]({{htmlUrl}})
```

## Requirements

- Obsidian 1.4.0 or later.
- Enable **Settings → Core plugins → Templates** and set a template folder, and/or install **Templater** and set its template folder.
- At least one `.md` template must exist in those folders for the import command to list templates.
- Template folders are read from the saved Templates and Templater settings each time the import dialog opens, so after changing a template folder, reopen the dialog.

## Releasing

1. Run `npm version <x.y.z>`. This updates `package.json`, syncs `manifest.json` and `versions.json`, commits, and creates a tag with no leading `v` (set by `.npmrc`).
2. Push the commit and tag: `git push --follow-tags`. For the first release, the version is already 1.0.0, so tag it directly: `git tag 1.0.0 && git push origin 1.0.0`.
3. The **Release Obsidian plugin** workflow runs lint, tests, and the build, then creates a draft GitHub release with `main.js`, `manifest.json`, and `styles.css` attached.
4. Review the draft release and publish it.

## Development

```bash
npm install
npm run dev      # watch build
npm run build    # production bundle
npm test              # unit tests
npm run test:coverage # tests + coverage (see coverage/index.html)
npm run lint
```

See [Obsidian plugin docs](https://docs.obsidian.md/Home) and [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).

## Manually installing

Copy `main.js`, `styles.css`, and `manifest.json` into `VaultFolder/.obsidian/plugins/opml-import/`.
