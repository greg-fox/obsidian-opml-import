import {Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, OpmlImportSettings, OpmlImportSettingTab} from "./settings";
import {OpmlImportModal} from "./importModal";

export default class OpmlImportPlugin extends Plugin {
	settings: OpmlImportSettings;

	async onload() {
		await this.loadSettings();

		// Add command to open import modal
		this.addCommand({
			id: 'import-opml',
			/* eslint-disable-next-line obsidianmd/ui/sentence-case -- OPML */
			name: 'Import outlines from OPML',
			callback: () => {
				new OpmlImportModal(this.app).open();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new OpmlImportSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<OpmlImportSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
