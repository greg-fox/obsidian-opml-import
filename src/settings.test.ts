import type {SettingDefinitionGroup, SettingDefinitionRender, Setting as ObsidianSetting} from 'obsidian';
import {describe, expect, it, vi} from 'vitest';
import OpmlImportPlugin from './main';
import {OpmlImportModal} from './importModal';
import {
	DEFAULT_SETTINGS,
	HOW_IT_WORKS_HEADING,
	HOW_IT_WORKS_ROWS,
	OpmlImportSettingTab,
	type OpmlImportSettings,
} from './settings';
import {Setting} from './test/obsidian-stub';

function createTab() {
	const plugin = new OpmlImportPlugin({} as never, {} as never);
	return new OpmlImportSettingTab({} as never, plugin);
}

function clickImport(container: HTMLElement) {
	Array.from(container.querySelectorAll('button'))
		.find((b) => b.textContent === 'Import')
		?.click();
}

describe('settings defaults', () => {
	it('has expected default settings shape', () => {
		const s: OpmlImportSettings = {...DEFAULT_SETTINGS};
		expect(s._version).toBe(2);
	});
});

describe('OpmlImportSettingTab.getSettingDefinitions', () => {
	it('returns the import row and a "How it works" group', () => {
		const [importRow, group] = createTab().getSettingDefinitions() as [
			SettingDefinitionRender,
			SettingDefinitionGroup,
		];
		expect(importRow.name).toBe('Import from OPML');
		expect(importRow.aliases).toContain('opml');
		expect(group.type).toBe('group');
		expect(group.heading).toBe(HOW_IT_WORKS_HEADING);
		expect(group.items?.map((i) => i.name)).toEqual(HOW_IT_WORKS_ROWS.map((r) => r.name));
	});

	it('renders an import button that opens the import modal', () => {
		const open = vi.spyOn(OpmlImportModal.prototype, 'open').mockImplementation(() => {});
		const [importRow] = createTab().getSettingDefinitions() as [SettingDefinitionRender];
		const container = document.createElement('div');
		importRow.render(new Setting(container) as unknown as ObsidianSetting, {} as never);
		clickImport(container);
		expect(open).toHaveBeenCalledTimes(1);
		open.mockRestore();
	});
});

describe('HOW_IT_WORKS_ROWS', () => {
	it('documents placeholders, YAML quoting, and import behaviour', () => {
		const text = HOW_IT_WORKS_ROWS.map((r) => r.desc).join(' ');
		expect(text).toContain('{{title}}, {{text}}, {{xmlUrl}}');
		expect(text).toContain('{{date}} and {{time}}');
		expect(text).toContain('quoted YAML strings');
		expect(text).toContain('never overwritten');
		expect(text).toContain('Templater commands (<% %>) are not run');
	});
});

describe('OpmlImportSettingTab.display (Obsidian before 1.13.0)', () => {
	it('renders the same rows as the definitions', () => {
		const tab = createTab();
		tab.display();
		const names = Array.from(tab.containerEl.querySelectorAll('.setting-item-name')).map((el) => el.textContent);
		expect(names).toEqual(['Import from OPML', HOW_IT_WORKS_HEADING, ...HOW_IT_WORKS_ROWS.map((r) => r.name)]);
	});

	it('re-renders without duplicating content', () => {
		const tab = createTab();
		tab.display();
		const count = tab.containerEl.childElementCount;
		tab.display();
		expect(tab.containerEl.childElementCount).toBe(count);
	});

	it('opens the import modal from the import button', () => {
		const open = vi.spyOn(OpmlImportModal.prototype, 'open').mockImplementation(() => {});
		const tab = createTab();
		tab.display();
		clickImport(tab.containerEl);
		expect(open).toHaveBeenCalledTimes(1);
		open.mockRestore();
	});
});
