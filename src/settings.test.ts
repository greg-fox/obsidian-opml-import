import {describe, expect, it, vi} from 'vitest';
import OpmlImportPlugin from './main';
import {DEFAULT_SETTINGS, OpmlImportSettingTab, type OpmlImportSettings} from './settings';

describe('settings defaults', () => {
	it('has expected default settings shape', () => {
		const s: OpmlImportSettings = {...DEFAULT_SETTINGS};
		expect(s._version).toBe(2);
	});
});

describe('OpmlImportSettingTab', () => {
	it('display builds settings UI', () => {
		const plugin = new OpmlImportPlugin({} as never, {} as never);
		const tab = new OpmlImportSettingTab({} as never, plugin);
		const containerEl = {
			empty: vi.fn(),
			createEl: vi.fn(() => ({})),
		};
		(tab as unknown as {containerEl: typeof containerEl}).containerEl = containerEl;
		tab.display();
		expect(containerEl.empty).toHaveBeenCalled();
	});
});
