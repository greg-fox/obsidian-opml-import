import {App, PluginSettingTab, Setting} from "obsidian";
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

export class OpmlImportSettingTab extends PluginSettingTab {
	plugin: OpmlImportPlugin;

	constructor(app: App, plugin: OpmlImportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		/* eslint-disable obsidianmd/ui/sentence-case -- OPML */
		new Setting(containerEl)
			.setName("Import")
			.setDesc("Choose an OPML file in your vault, a template from your Templates or Templater folder, and a folder for new notes.")
			.addButton((button) =>
				button
					.setButtonText("Import from OPML")
					.setCta()
					.onClick(() => {
						new OpmlImportModal(this.app).open();
					}),
			);
		/* eslint-enable obsidianmd/ui/sentence-case */

		new Setting(containerEl).setName("Templates").setHeading();

		/* eslint-disable obsidianmd/ui/sentence-case -- Templater, OPML, Markdown */
		containerEl.createEl("p", {
			text: "Imports use the same template folders as the core Templates plugin and/or Templater. Put a Markdown template in that folder, then use Import from OPML above or the command palette.",
			cls: "setting-item-description",
		});

		new Setting(containerEl).setName("How it works").setHeading();

		containerEl.createEl("p", {
			text: "1. Enable Settings → Core plugins → Templates and choose a template folder, or install Templater (community plugin) and set its template folder.",
			cls: "setting-item-description",
		});
		containerEl.createEl("p", {
			text: "2. Create a Markdown template in that folder. During import, these placeholders are replaced with fields from each OPML row:",
			cls: "setting-item-description",
		});
		containerEl.createEl("pre", {
			text: "{{title}}  {{text}}  {{xmlUrl}}  {{htmlUrl}}  {{type}}  {{created}}  {{category}}",
			cls: "opml-import-code-block",
		});
		containerEl.createEl("p", {
			text: "Templater commands (`<% ... %>`) are not executed during import — only the placeholders above are substituted.",
			cls: "setting-item-description",
		});
		/* eslint-enable obsidianmd/ui/sentence-case */
	}
}
