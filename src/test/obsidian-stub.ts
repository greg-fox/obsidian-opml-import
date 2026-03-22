/**
 * Minimal stubs for `obsidian` when running Vitest (the real package targets Electron).
 * Vitest resolves `obsidian` to this file via `resolve.alias` in vitest.config.ts.
 */
import {vi} from 'vitest';

export const mockPluginLoadData = vi.fn().mockResolvedValue({});
export const mockPluginSaveData = vi.fn().mockResolvedValue(undefined);
export const mockPluginAddCommand = vi.fn();
export const mockPluginAddSettingTab = vi.fn();

export class Plugin {
	app: unknown = {};
	loadData = mockPluginLoadData;
	saveData = mockPluginSaveData;
	addCommand = mockPluginAddCommand;
	addSettingTab = mockPluginAddSettingTab;
}

export class PluginSettingTab {
	constructor(
		public app: unknown,
		public plugin: unknown,
	) {}
	display() {}
}

type ButtonChain = {
	setButtonText: (_s: string) => {setCta: () => {onClick: (fn: () => void) => void}};
};

export class Setting {
	constructor(public containerEl: unknown) {}
	setName() {
		return this;
	}
	setHeading() {
		return this;
	}
	setDesc() {
		return this;
	}
	addButton(cb: (b: ButtonChain) => void) {
		const button: ButtonChain = {
			setButtonText: () => ({
				setCta: () => ({
					onClick: (fn: () => void) => {
						fn();
					},
				}),
			}),
		};
		cb(button);
		return this;
	}
}

export class Modal {
	constructor(public app: unknown) {}
	open() {}
	close() {}
}

export class Notice {
	constructor(_message: string) {}
}

export class TFile {}

export class TFolder {
	path = '';
}

export type App = {
	vault: {
		getAbstractFileByPath: (path: string) => unknown;
		getMarkdownFiles: () => TFile[];
	};
	internalPlugins?: {plugins?: unknown};
	plugins?: {plugins?: Record<string, unknown>};
};
