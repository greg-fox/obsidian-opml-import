import {App, Modal, Notice, TFile, TFolder} from 'obsidian';
import * as opml from 'opml';
import type { OpmlOutline } from './opmlTypes';
import { applyOpmlPlaceholders } from './opmlPlaceholders';
import { splitFrontmatter } from './splitFrontmatter';
import { collectVaultTemplateFiles } from './vaultTemplateSources';

export type { OpmlOutline };

export class OpmlImportModal extends Modal {
	selectedFile: TFile | null = null;
	selectedTemplateFile: TFile | null = null;
	selectedFolder: TFolder | null = null;
	errorMessage: string = '';

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();

		contentEl.createEl('h2', {text: 'Import outlines'});

		const vaultTemplates = collectVaultTemplateFiles(this.app);
		if (vaultTemplates.length === 0) {
			contentEl.createEl('div', {
				cls: 'opml-import-error',
				text: 'No vault templates found. Enable the core Templates plugin (Settings → Core plugins) and set a template folder, or install Templater and set its template folder. Add a Markdown file in that folder with placeholders such as {{title}} and {{text}}.',
			});
			contentEl.createEl('button', {text: 'Close', cls: 'mod-cta'}).addEventListener('click', () => this.close());
			return;
		}

		// File selection
		const fileSetting = contentEl.createDiv('opml-import-setting');
		fileSetting.createEl('label', {text: 'Outline file', cls: 'opml-import-label'});
		const fileInputContainer = fileSetting.createDiv('file-input-container');

		const fileInput = fileInputContainer.createEl('input', {
			type: 'text',
			placeholder: 'Path in vault (e.g. folder/export.opml)',
			cls: 'opml-import-input',
		});
		fileInput.value = this.selectedFile ? this.selectedFile.path : '';

		const browseButton = fileInputContainer.createEl('button', {
			text: 'Browse',
			cls: 'mod-cta',
		});

		// Template selection (vault .md files from Core Templates / Templater folders)
		const templateSetting = contentEl.createDiv('opml-import-setting');
		templateSetting.createEl('label', {text: 'Template', cls: 'opml-import-label'});
		const templateSelect = templateSetting.createEl('select', {cls: 'opml-import-select'});

		const emptyOption = templateSelect.createEl('option', {text: 'Select a template...', value: ''});
		emptyOption.selected = true;

		const byGroup = new Map<string, typeof vaultTemplates>();
		for (const opt of vaultTemplates) {
			const list = byGroup.get(opt.groupLabel) ?? [];
			list.push(opt);
			byGroup.set(opt.groupLabel, list);
		}
		for (const [groupLabel, options] of byGroup) {
			const og = templateSelect.createEl('optgroup', {attr: {label: groupLabel}});
			for (const opt of options) {
				const option = og.createEl('option', {
					text: opt.file.basename,
					value: opt.file.path,
				});
				if (this.selectedTemplateFile && opt.file.path === this.selectedTemplateFile.path) {
					option.selected = true;
					emptyOption.selected = false;
				}
			}
		}

		// Folder selection
		const folderSetting = contentEl.createDiv('opml-import-setting');
		folderSetting.createEl('label', {text: 'Destination folder', cls: 'opml-import-label'});
		const folderInputContainer = folderSetting.createDiv('folder-input-container');

		const folderInput = folderInputContainer.createEl('input', {
			type: 'text',
			placeholder: 'Enter folder path (leave empty for root)',
			cls: 'opml-import-input',
		});
		folderInput.value = this.selectedFolder && this.selectedFolder.path !== '/' ? this.selectedFolder.path : '';

		if (!this.selectedFolder) {
			this.selectedFolder = this.app.vault.getRoot();
		}

		const errorDiv = contentEl.createDiv('opml-import-error');
		errorDiv.toggleVisibility(!!this.errorMessage);
		errorDiv.textContent = this.errorMessage;

		const buttonContainer = contentEl.createDiv('opml-import-buttons');
		const importButton = buttonContainer.createEl('button', {
			text: 'Import',
			cls: 'mod-cta',
		});

		const updateImportButton = () => {
			const isValid =
				this.selectedFile !== null &&
				this.selectedTemplateFile !== null &&
				this.selectedFolder !== null;
			importButton.disabled = !isValid;
		};

		fileInput.onchange = () => {
			const path = fileInput.value.trim();
			if (path) {
				const file = this.app.vault.getAbstractFileByPath(path);
				if (file && file instanceof TFile && (file.extension === 'opml' || file.extension === 'xml')) {
					this.selectedFile = file;
					this.errorMessage = '';
				} else {
					this.selectedFile = null;
					this.errorMessage = 'Invalid OPML file path';
				}
			} else {
				this.selectedFile = null;
				this.errorMessage = '';
			}
			this.updateErrorDisplay();
			updateImportButton();
		};

		templateSelect.onchange = () => {
			const p = templateSelect.value;
			const f = p ? this.app.vault.getAbstractFileByPath(p) : null;
			this.selectedTemplateFile = f instanceof TFile ? f : null;
			this.errorMessage = '';
			this.updateErrorDisplay();
			updateImportButton();
		};

		folderInput.onchange = () => {
			const path = folderInput.value.trim();
			if (!path || path === '/') {
				this.selectedFolder = this.app.vault.getRoot();
				this.errorMessage = '';
			} else {
				const folder = this.app.vault.getAbstractFileByPath(path);
				if (folder instanceof TFolder) {
					this.selectedFolder = folder;
					this.errorMessage = '';
				} else {
					this.selectedFolder = null;
					this.errorMessage = 'Invalid folder path';
				}
			}
			this.updateErrorDisplay();
			updateImportButton();
		};

		browseButton.onclick = () => {
			const files = this.app.vault.getFiles().filter((f) => f.extension === 'opml' || f.extension === 'xml');
			if (files.length === 0) {
				/* eslint-disable-next-line obsidianmd/ui/sentence-case -- OPML */
				new Notice('No OPML files found in the vault');
				return;
			}
			if (files.length === 1 && files[0]) {
				this.selectedFile = files[0];
				fileInput.value = files[0].path;
				this.errorMessage = '';
				this.updateErrorDisplay();
				updateImportButton();
			} else {
				new Notice(`Found ${files.length} OPML files. Please enter the file path manually.`);
			}
		};

		updateImportButton();

		importButton.onclick = async () => {
			await this.performImport();
		};

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel',
		});
		cancelButton.onclick = () => {
			this.close();
		};
	}

	private updateErrorDisplay(): void {
		const errorDiv = this.contentEl.querySelector('.opml-import-error');
		if (errorDiv instanceof HTMLElement) {
			errorDiv.textContent = this.errorMessage;
			errorDiv.toggleVisibility(!!this.errorMessage);
		}
	}

	private async performImport(): Promise<void> {
		if (!this.selectedFile) {
			this.errorMessage = 'Please select an OPML file';
			this.updateErrorDisplay();
			return;
		}

		if (!this.selectedTemplateFile) {
			this.errorMessage = 'Please select a template';
			this.updateErrorDisplay();
			return;
		}

		if (!this.selectedFolder) {
			this.errorMessage = 'Please select a destination folder';
			this.updateErrorDisplay();
			return;
		}

		const destinationFolder = this.selectedFolder;
		const templateFile = this.selectedTemplateFile;

		try {
			const opmlContent = await this.app.vault.read(this.selectedFile);
			const outline = await this.parseOpml(opmlContent);

			if (!outline) {
				this.errorMessage = 'Invalid OPML file format';
				this.updateErrorDisplay();
				return;
			}

			const outlines = this.getOutlinesFromParsed(outline);

			if (outlines.length === 0) {
				this.errorMessage =
					'No outline entries found in the OPML file. The file may be empty or use an unexpected structure.';
				this.updateErrorDisplay();
				return;
			}

			const templateContent = await this.app.vault.read(templateFile);

			let successCount = 0;
			let errorCount = 0;

			for (const item of outlines) {
				try {
					await this.createNoteFromOutline(item, templateContent, destinationFolder);
					successCount++;
				} catch (error) {
					console.error('Error creating note:', error);
					errorCount++;
				}
			}

			if (errorCount > 0) {
				new Notice(`Import completed: ${successCount} notes created, ${errorCount} errors`);
			} else {
				new Notice(`Successfully imported ${successCount} notes`);
			}

			this.close();
		} catch (error) {
			console.error('Import error:', error);
			this.errorMessage = `Error importing OPML: ${error instanceof Error ? error.message : String(error)}`;
			this.updateErrorDisplay();
		}
	}

	private parseOpml(opmlContent: string): Promise<unknown> {
		return new Promise((resolve, reject) => {
			try {
				opml.parse(opmlContent, (err: Error | null, parsed: unknown) => {
					if (err) {
						reject(err instanceof Error ? err : new Error(String(err)));
						return;
					}
					resolve(parsed);
				});
			} catch (error) {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	private getOutlinesFromParsed(parsed: unknown): OpmlOutline[] {
		const result: OpmlOutline[] = [];
		const opmlBody = (parsed as { opml?: { body?: unknown } })?.opml?.body;
		if (!opmlBody) return result;

		const body = opmlBody as { subs?: OpmlOutline[]; text?: string; title?: string; xmlUrl?: string };
		const topLevel = body.subs;
		if (Array.isArray(topLevel)) {
			for (const item of topLevel) {
				result.push(...this.flattenOutlines(item));
			}
		} else {
			if (body.text || body.title || body.xmlUrl) {
				result.push(body as OpmlOutline);
			}
		}
		return result;
	}

	private flattenOutlines(outline: OpmlOutline): OpmlOutline[] {
		const result: OpmlOutline[] = [];
		if (outline.text || outline.title || outline.xmlUrl) {
			result.push(outline);
		}
		const children = outline.subs ?? outline.outline;
		if (children && Array.isArray(children)) {
			for (const child of children) {
				result.push(...this.flattenOutlines(child));
			}
		}
		return result;
	}

	private async createNoteFromOutline(
		outline: OpmlOutline,
		templateContent: string,
		folder: TFolder,
	): Promise<void> {
		const {frontmatter: fmRaw, body: bodyRaw} = splitFrontmatter(templateContent);
		const frontmatter = applyOpmlPlaceholders(fmRaw, outline, true);
		const body = applyOpmlPlaceholders(bodyRaw, outline, false);

		let content = '';
		if (frontmatter.trim()) {
			let fm = frontmatter.trim();
			if (!fm.startsWith('---')) {
				fm = '---\n' + fm;
			}
			if (!fm.endsWith('---')) {
				fm = fm + '\n---';
			}
			content = fm + '\n\n' + body;
		} else {
			content = body;
		}

		const filename = this.generateFilename(outline);
		const filePath = folder.path === '/' ? `${filename}.md` : `${folder.path}/${filename}.md`;

		let finalPath = filePath;
		let counter = 1;
		while (await this.app.vault.adapter.exists(finalPath)) {
			const baseName = filename + (counter > 1 ? `-${counter - 1}` : '');
			finalPath =
				folder.path === '/' ? `${baseName}-${counter}.md` : `${folder.path}/${baseName}-${counter}.md`;
			counter++;
		}

		await this.app.vault.create(finalPath, content);
	}

	private generateFilename(outline: OpmlOutline): string {
		const name = outline.title || outline.text || 'Untitled';
		return (
			name
				.replace(/[<>:"/\\|?*]/g, '')
				.replace(/\s+/g, ' ')
				.substring(0, 100)
				.trim() || 'Untitled'
		);
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
