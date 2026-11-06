/**
 * Test double for the `obsidian` module (the real package only runs inside the app).
 * Vitest resolves `obsidian` to this file via `resolve.alias` in vitest.config.ts.
 * UI classes build real DOM nodes (happy-dom) so tests can query and interact with them;
 * the Obsidian `HTMLElement` helpers they rely on are installed by `./setup.ts`.
 */
import {vi} from 'vitest';

/** Fixed instant returned by the stub `moment()`: 2026-01-02 03:04:05. */
export const STUB_NOW = {YYYY: '2026', MM: '01', DD: '02', HH: '03', mm: '04', ss: '05'} as const;

/**
 * Minimal stand-in for Obsidian's bundled moment: always returns {@link STUB_NOW} and supports
 * the YYYY, MM, DD, HH, mm, and ss tokens, so date placeholders are deterministic in tests.
 */
export function moment() {
	return {
		format: (format = 'YYYY-MM-DDTHH:mm:ss') =>
			format.replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => STUB_NOW[token as keyof typeof STUB_NOW]),
	};
}

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
	containerEl: HTMLElement = document.createElement('div');
	constructor(
		public app: unknown,
		public plugin: unknown,
	) {}
	display() {}
}

/** Mirrors Obsidian's `normalizePath`: forward slashes, no duplicate/leading/trailing slashes. */
export function normalizePath(path: string): string {
	const normalized = path
		.replace(/[\\/]+/g, '/')
		.replace(/^\/+|\/+$/g, '')
		.replace(/\u00A0|\u202F/g, ' ')
		.normalize('NFC');
	return normalized === '' ? '/' : normalized;
}

export class ButtonComponent {
	buttonEl: HTMLButtonElement;
	disabled = false;
	constructor(containerEl: HTMLElement) {
		this.buttonEl = containerEl.createEl('button');
	}
	setButtonText(text: string) {
		this.buttonEl.setText(text);
		return this;
	}
	setCta() {
		this.buttonEl.addClass('mod-cta');
		return this;
	}
	setDisabled(disabled: boolean) {
		this.disabled = disabled;
		this.buttonEl.disabled = disabled;
		return this;
	}
	onClick(cb: (evt: MouseEvent) => unknown) {
		this.buttonEl.addEventListener('click', (evt) => {
			if (!this.disabled) cb(evt);
		});
		return this;
	}
}

export class TextComponent {
	inputEl: HTMLInputElement;
	constructor(containerEl: HTMLElement) {
		this.inputEl = containerEl.createEl('input', {type: 'text'});
	}
	setPlaceholder(placeholder: string) {
		this.inputEl.placeholder = placeholder;
		return this;
	}
	setValue(value: string) {
		this.inputEl.value = value;
		return this;
	}
	getValue() {
		return this.inputEl.value;
	}
	onChange(cb: (value: string) => unknown) {
		this.inputEl.addEventListener('input', () => cb(this.inputEl.value));
		return this;
	}
}

export class DropdownComponent {
	selectEl: HTMLSelectElement;
	constructor(containerEl: HTMLElement) {
		this.selectEl = containerEl.createEl('select');
	}
	addOption(value: string, display: string) {
		this.selectEl.createEl('option', {value, text: display});
		return this;
	}
	setValue(value: string) {
		this.selectEl.value = value;
		return this;
	}
	getValue() {
		return this.selectEl.value;
	}
	onChange(cb: (value: string) => unknown) {
		this.selectEl.addEventListener('change', () => cb(this.selectEl.value));
		return this;
	}
}

export class Setting {
	settingEl: HTMLElement;
	nameEl: HTMLElement;
	descEl: HTMLElement;
	controlEl: HTMLElement;
	constructor(containerEl: HTMLElement) {
		this.settingEl = containerEl.createDiv({cls: 'setting-item'});
		this.nameEl = this.settingEl.createDiv({cls: 'setting-item-name'});
		this.descEl = this.settingEl.createDiv({cls: 'setting-item-description'});
		this.controlEl = this.settingEl.createDiv({cls: 'setting-item-control'});
	}
	setName(name: string) {
		this.nameEl.setText(name);
		return this;
	}
	setDesc(desc: string) {
		this.descEl.setText(desc);
		return this;
	}
	setHeading() {
		this.settingEl.addClass('setting-item-heading');
		return this;
	}
	addButton(cb: (button: ButtonComponent) => unknown) {
		cb(new ButtonComponent(this.controlEl));
		return this;
	}
	addText(cb: (text: TextComponent) => unknown) {
		cb(new TextComponent(this.controlEl));
		return this;
	}
	addDropdown(cb: (dropdown: DropdownComponent) => unknown) {
		cb(new DropdownComponent(this.controlEl));
		return this;
	}
}

export class Modal {
	modalEl: HTMLElement = document.createElement('div');
	titleEl: HTMLElement = this.modalEl.createDiv({cls: 'modal-title'});
	contentEl: HTMLElement = this.modalEl.createDiv({cls: 'modal-content'});
	isOpen = false;
	constructor(public app: unknown) {}
	setTitle(title: string) {
		this.titleEl.setText(title);
		return this;
	}
	open() {
		this.isOpen = true;
		void this.onOpen();
	}
	close() {
		this.isOpen = false;
		this.onClose();
	}
	onOpen(): void | Promise<void> {}
	onClose(): void {}
}

/** Messages passed to `new Notice(...)`, in order. Clear between tests. */
export const notices: string[] = [];

export class Notice {
	constructor(message: string) {
		notices.push(message);
	}
}

export abstract class TAbstractFile {
	path = '';
	name = '';
	parent: TFolder | null = null;
}

export class TFile extends TAbstractFile {
	basename = '';
	extension = '';
}

export class TFolder extends TAbstractFile {
	children: TAbstractFile[] = [];
}

export type App = {
	vault: {
		configDir: string;
		getAbstractFileByPath: (path: string) => TAbstractFile | null;
		getAllLoadedFiles: () => TAbstractFile[];
		getMarkdownFiles: () => TFile[];
		getFiles: () => TFile[];
		read: (file: TFile) => Promise<string>;
		create: (path: string, data: string) => Promise<TFile>;
		createFolder: (path: string) => Promise<TFolder>;
		adapter: {read: (path: string) => Promise<string>};
	};
};
