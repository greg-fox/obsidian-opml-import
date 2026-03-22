# OPML Import

Import [OPML](https://opml.org/spec2.opml) outlines into Markdown notes in your [Obsidian](https://obsidian.md) vault.

## Features

- **Settings → Community plugins → OPML Import → Import from OPML**, or the command **Import outlines from OPML**: choose an OPML/XML file in the vault, a **template** (Markdown note from your [Templates](https://help.obsidian.md/Plugins/Templates) folder and/or [Templater](https://github.com/SilentVoid13/Templater) template folder), and a destination folder.
- Each outline row becomes a note. Placeholders in the template are replaced: `{{title}}`, `{{text}}`, `{{xmlUrl}}`, `{{htmlUrl}}`, `{{type}}`, `{{created}}`, `{{category}}`.
- YAML frontmatter in the template is supported; values substituted into frontmatter are sanitized so common characters (e.g. `:`) do not break YAML.
- **Templater** `<% ... %>` snippets are **not** run during import—only the placeholders above are substituted. Use a normal Markdown template for imports.

## Requirements

- Enable **Settings → Core plugins → Templates** and set a template folder, and/or install **Templater** and set its template folder.
- At least one `.md` template must exist in those folders for the import command to list templates.

## Development

```bash
npm install
npm run dev      # watch build
npm run build    # production bundle
npm test         # unit tests
npm run lint
```

See [Obsidian plugin docs](https://docs.obsidian.md/Home) and [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).

## Manually installing

Copy `main.js`, `styles.css`, and `manifest.json` into `VaultFolder/.obsidian/plugins/opml-import/`.
