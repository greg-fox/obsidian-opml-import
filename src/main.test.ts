import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
	mockPluginAddCommand,
	mockPluginAddSettingTab,
	mockPluginLoadData,
	mockPluginSaveData,
} from './test/obsidian-stub';

describe('OpmlImportPlugin', () => {
	beforeEach(() => {
		mockPluginLoadData.mockClear();
		mockPluginSaveData.mockClear();
		mockPluginAddCommand.mockClear();
		mockPluginAddSettingTab.mockClear();
	});

	it('onload registers command and settings tab', async () => {
		const {default: OpmlImportPlugin} = await import('./main');
		const plugin = new OpmlImportPlugin({} as never, {} as never);
		await plugin.onload();
		expect(mockPluginLoadData).toHaveBeenCalled();
		expect(mockPluginAddCommand).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'import-opml',
			}),
		);
		expect(mockPluginAddSettingTab).toHaveBeenCalled();
	});

	it('runs import command callback', async () => {
		const {OpmlImportModal} = await import('./importModal');
		const spy = vi.spyOn(OpmlImportModal.prototype, 'open').mockImplementation(() => {});
		const {default: OpmlImportPlugin} = await import('./main');
		const plugin = new OpmlImportPlugin({} as never, {} as never);
		await plugin.onload();
		const cmd = mockPluginAddCommand.mock.calls[0]?.[0] as {callback: () => void};
		cmd.callback();
		expect(spy).toHaveBeenCalled();
		spy.mockRestore();
	});

	it('saveSettings writes plugin data', async () => {
		const {default: OpmlImportPlugin} = await import('./main');
		const plugin = new OpmlImportPlugin({} as never, {} as never);
		plugin.settings = {_version: 2};
		await plugin.saveSettings();
		expect(mockPluginSaveData).toHaveBeenCalledWith({_version: 2});
	});

	it('onunload is safe to call', async () => {
		const {default: OpmlImportPlugin} = await import('./main');
		const plugin = new OpmlImportPlugin({} as never, {} as never);
		expect(() => plugin.onunload()).not.toThrow();
	});
});
