import {App, PluginSettingTab, Setting, type SettingDefinitionItem} from "obsidian";
import OpmlImportPlugin from "./main";
import {OpmlImportModal} from "./importModal";

/** Plugin settings (templates come from core Templates / Templater vault folders, not stored here). */
export interface OpmlImportSettings {
	/** Reserved for future persisted options */
	_version?: number;
}

export const DEFAULT_SETTINGS: OpmlImportSettings = {
	_version: 2,
};

interface InfoRow {
	name: string;
	desc: string;
	aliases?: string[];
}

const IMPORT_ROW: InfoRow = {
	name: "Import from OPML",
	desc: "Choose an OPML file in your vault, a template from your Templates or Templater folder, and a folder for new notes.",
	aliases: ["outline", "opml", "import", "feeds", "podcasts"],
};

export const HOW_IT_WORKS_HEADING = "How it works";

/** Explanatory rows shown under "How it works". Shared by both rendering paths so they cannot drift. */
export const HOW_IT_WORKS_ROWS: InfoRow[] = [
	{
		name: "Template folders",
		desc: "Templates come from the template folder of the core Templates plugin and of Templater. Enable either plugin, set its template folder, and add a Markdown template there.",
		aliases: ["templater", "templates"],
	},
	{
		name: "Placeholders",
		desc: "{{title}}, {{text}}, {{xmlUrl}}, {{htmlUrl}}, {{type}}, {{created}}, and {{category}} are filled from each outline entry. Spaces inside the braces are allowed. {{date}} and {{time}} use the formats from the core Templates settings, and {{date:YYYY-MM-DD}} sets a format.",
		aliases: ["variables", "date", "time"],
	},
	{
		name: "Frontmatter",
		desc: "In frontmatter, values are written as quoted YAML strings, so URLs and titles with colons stay intact. In the note body, values are inserted as-is. Quote placeholders in a template's frontmatter, such as url: \"{{xmlUrl}}\", so editing the template in the Properties view does not change them.",
		aliases: ["yaml", "properties"],
	},
	{
		name: "Which entries become notes",
		desc: "Outlines that only group other outlines, such as a category folder, are skipped. Every other entry becomes a note.",
	},
	{
		name: "Existing notes",
		desc: "Existing notes are never overwritten: a number is added to the new note's name instead. A missing destination folder is created.",
		aliases: ["duplicates", "overwrite"],
	},
	{
		name: "Templater commands",
		desc: "Templater commands (<% %>) are not run during import and stay in the note as plain text.",
	},
];

export class OpmlImportSettingTab extends PluginSettingTab {
	plugin: OpmlImportPlugin;

	constructor(app: App, plugin: OpmlImportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Declarative settings (Obsidian 1.13.0+), which also makes these rows searchable. */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				...IMPORT_ROW,
				render: (setting) => {
					this.addImportButton(setting);
				},
			},
			{
				type: "group",
				heading: HOW_IT_WORKS_HEADING,
				items: HOW_IT_WORKS_ROWS.map((row) => ({...row})),
			},
		];
	}

	/** Fallback for Obsidian versions before 1.13.0, which do not call getSettingDefinitions(). */
	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		this.addImportButton(new Setting(containerEl).setName(IMPORT_ROW.name).setDesc(IMPORT_ROW.desc));

		new Setting(containerEl).setName(HOW_IT_WORKS_HEADING).setHeading();
		for (const row of HOW_IT_WORKS_ROWS) {
			new Setting(containerEl).setName(row.name).setDesc(row.desc);
		}
	}

	private addImportButton(setting: Setting): void {
		setting.addButton((button) =>
			button
				.setButtonText("Import")
				.setCta()
				.onClick(() => {
					new OpmlImportModal(this.app).open();
				}),
		);
	}
}
