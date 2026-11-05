import {describe, expect, it, vi} from 'vitest';
import OpmlImportPlugin from './main';
import {OpmlImportModal} from './importModal';
import {DEFAULT_SETTINGS, OpmlImportSettingTab, type OpmlImportSettings} from './settings';

describe('settings defaults', () => {
	it('has expected default settings shape', () => {
		const s: OpmlImportSettings = {...DEFAULT_SETTINGS};
		expect(s._version).toBe(2);
	});
});

describe('OpmlImportSettingTab', () => {
	const render = () => {
		const plugin = new OpmlImportPlugin({} as never, {} as never);
		const tab = new OpmlImportSettingTab({} as never, plugin);
		tab.display();
		return tab.containerEl;
	};

	it('documents placeholders, YAML quoting, and import behaviour', () => {
		const text = render().textContent ?? '';
		expect(text).toContain('{{title}}  {{text}}  {{xmlUrl}}');
		expect(text).toContain('quoted YAML strings');
		expect(text).toContain('Existing notes are never overwritten');
		expect(text).toContain('created if it does not exist');
	});

	it('re-renders without duplicating content', () => {
		const plugin = new OpmlImportPlugin({} as never, {} as never);
		const tab = new OpmlImportSettingTab({} as never, plugin);
		tab.display();
		const count = tab.containerEl.childElementCount;
		tab.display();
		expect(tab.containerEl.childElementCount).toBe(count);
	});

	it('opens the import modal from the import button', () => {
		const open = vi.spyOn(OpmlImportModal.prototype, 'open').mockImplementation(() => {});
		const button = Array.from(render().querySelectorAll('button')).find((b) => b.textContent === 'Import from OPML');
		button?.click();
		expect(open).toHaveBeenCalledTimes(1);
		open.mockRestore();
	});
});
