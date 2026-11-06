import {App, ButtonComponent, Modal, Notice, Setting, TFile} from 'obsidian';
import {collectImportableOutlines, generateFilenameFromOutline} from './opmlOutlines';
import type {OpmlOutline} from './opmlTypes';
import {parseOpml} from './parseOpml';
import {
	createNotesFromOutlines,
	ensureFolder,
	getFolderStatus,
	matchExistingCase,
	normalizeFolderPath,
	type FolderStatus,
} from './importNotes';
import {createPlaceholderContext} from './opmlPlaceholders';
import {collectVaultTemplateFiles, getCoreTemplateFormats} from './vaultTemplateSources';

const OUTLINE_EXTENSIONS = ['opml', 'xml'];
const PREVIEW_SAMPLE_SIZE = 5;
/** Templater command tags, which this plugin does not execute. */
const TEMPLATER_COMMAND = /<%[\s\S]*?%>/;

export const TEMPLATER_WARNING =
	'This template contains Templater commands (<% %>). They are not run during import and will appear as plain text in the new notes.';

function isOutlineFile(file: unknown): file is TFile {
	return file instanceof TFile && OUTLINE_EXTENSIONS.includes(file.extension.toLowerCase());
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export class OpmlImportModal extends Modal {
	outlineFile: TFile | null = null;
	/** Rows from {@link outlineFile} that will become notes. */
	outlines: OpmlOutline[] = [];
	templateFile: TFile | null = null;
	/** Normalized destination; `''` is the vault root. */
	folderPath = '';

	private outlineError = '';
	private importError = '';
	private templateWarning = '';
	private importing = false;

	private outlineInputEl: HTMLInputElement | null = null;
	private previewEl: HTMLElement | null = null;
	private errorEl: HTMLElement | null = null;
	private warningEl: HTMLElement | null = null;
	private importButton: ButtonComponent | null = null;

	constructor(app: App) {
		super(app);
	}

	async onOpen(): Promise<void> {
		const {contentEl} = this;
		contentEl.empty();
		this.modalEl.addClass('opml-import-modal');
		// titleEl rather than setTitle(), which is not available in every supported Obsidian version.
		this.titleEl.setText('Import outlines');

		const templates = await collectVaultTemplateFiles(this.app);
		if (templates.length === 0) {
			this.renderNoTemplates();
			return;
		}

		new Setting(contentEl)
			.setName('Outline file')
			.setDesc('Path to an .opml or .xml file in the vault.')
			.addText((text) => {
				text.setPlaceholder('Folder/export.opml');
				this.outlineInputEl = text.inputEl;
				text.inputEl.addEventListener('change', () => {
					void this.selectOutlineFile(text.inputEl.value);
				});
			})
			.addButton((button) =>
				button.setButtonText('Browse').onClick(() => {
					void this.browseForOutlineFile();
				}),
			);

		new Setting(contentEl)
			.setName('Template')
			.setDesc('A note from your Templates or Templater folder.')
			.addDropdown((dropdown) => {
				dropdown.addOption('', 'Select a template...');
				const groups = new Map<string, HTMLOptGroupElement>();
				for (const {file, groupLabel} of templates) {
					let group = groups.get(groupLabel);
					if (!group) {
						group = dropdown.selectEl.createEl('optgroup', {attr: {label: groupLabel}});
						groups.set(groupLabel, group);
					}
					group.createEl('option', {text: file.basename, value: file.path});
				}
				dropdown.onChange((value) => {
					void this.selectTemplate(value);
				});
			});

		new Setting(contentEl)
			.setName('Destination folder')
			.setDesc('Leave empty for the vault root. Missing folders are created.')
			.addText((text) => {
				text.setPlaceholder('Podcasts');
				text.inputEl.addEventListener('change', () => this.setDestination(text.inputEl.value));
			});

		this.previewEl = contentEl.createDiv({cls: 'opml-import-preview'});
		this.warningEl = contentEl.createDiv({cls: 'opml-import-warning'});
		this.errorEl = contentEl.createDiv({cls: 'opml-import-error'});

		new Setting(contentEl)
			.addButton((button) => {
				this.importButton = button;
				button
					.setButtonText('Import')
					.setCta()
					.onClick(() => {
						void this.runImport();
					});
			})
			.addButton((button) => button.setButtonText('Cancel').onClick(() => this.close()));

		this.refresh();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	/** Resolve a vault path, then read and parse it so the preview can show what will be created. */
	async selectOutlineFile(rawPath: string): Promise<void> {
		const path = rawPath.trim();
		this.outlineFile = null;
		this.outlines = [];
		this.outlineError = '';
		this.importError = '';

		if (path !== '') {
			const file = this.app.vault.getAbstractFileByPath(path);
			if (isOutlineFile(file)) {
				this.outlineFile = file;
				try {
					this.outlines = collectImportableOutlines(parseOpml(await this.app.vault.read(file)));
					if (this.outlines.length === 0) {
						this.outlineError = 'No outline entries found in this file.';
					}
				} catch (error) {
					this.outlineError = `Could not read the outline file: ${errorMessage(error)}`;
				}
			} else {
				this.outlineError = 'No .opml or .xml file exists at that path.';
			}
		}
		this.refresh();
	}

	/** Select a template and warn if it contains Templater commands, which are not run. */
	async selectTemplate(path: string): Promise<void> {
		const found = path ? this.app.vault.getAbstractFileByPath(path) : null;
		const file = found instanceof TFile ? found : null;
		this.templateFile = file;
		this.templateWarning = '';
		this.importError = '';
		this.refresh();
		if (!file) return;

		let content: string;
		try {
			content = await this.app.vault.read(file);
		} catch {
			return; // A read failure is reported when the import reads the template.
		}
		// Ignore the result if another template was selected while this one was being read.
		if (this.templateFile !== file) return;
		this.templateWarning = TEMPLATER_COMMAND.test(content) ? TEMPLATER_WARNING : '';
		this.refresh();
	}

	setDestination(rawPath: string): void {
		this.folderPath = matchExistingCase(this.app, normalizeFolderPath(rawPath));
		this.importError = '';
		this.refresh();
	}

	private async browseForOutlineFile(): Promise<void> {
		const files = this.app.vault.getFiles().filter(isOutlineFile);
		const [only] = files;
		if (files.length === 1 && only) {
			if (this.outlineInputEl) this.outlineInputEl.value = only.path;
			await this.selectOutlineFile(only.path);
		} else if (files.length === 0) {
			new Notice('No .opml or .xml files found in the vault.');
		} else {
			new Notice(`Found ${files.length} outline files. Enter the path of the one to import.`);
		}
	}

	private folderStatus(): FolderStatus {
		return getFolderStatus(this.app, this.folderPath);
	}

	private canImport(): boolean {
		return (
			!this.importing &&
			this.outlineFile !== null &&
			this.outlines.length > 0 &&
			this.templateFile !== null &&
			this.folderStatus() !== 'not-a-folder'
		);
	}

	/** Re-render the preview, error, and import button from current state. */
	private refresh(): void {
		const folderStatus = this.folderStatus();
		const errors = [this.importError, this.outlineError];
		if (folderStatus === 'not-a-folder') {
			errors.push(`"${this.folderPath}" is a file, not a folder.`);
		}
		const error = errors.find((e) => e !== '') ?? '';

		if (this.errorEl) {
			this.errorEl.setText(error);
			this.errorEl.toggle(error !== '');
		}
		if (this.previewEl) {
			this.renderPreview(this.previewEl, folderStatus);
		}
		if (this.warningEl) {
			this.warningEl.setText(this.templateWarning);
			this.warningEl.toggle(this.templateWarning !== '');
		}
		this.importButton?.setDisabled(!this.canImport());
	}

	private renderPreview(el: HTMLElement, folderStatus: FolderStatus): void {
		el.empty();
		const count = this.outlines.length;
		el.toggle(count > 0);
		if (count === 0) return;

		const destination = this.folderPath === '' ? 'the vault root' : this.folderPath;
		const notes = count === 1 ? '1 note' : `${count} notes`;
		el.createEl('p', {text: `${notes} will be created in ${destination}.`});
		if (folderStatus === 'missing') {
			el.createEl('p', {text: `The folder ${this.folderPath} will be created.`});
		}

		const list = el.createEl('ul');
		for (const outline of this.outlines.slice(0, PREVIEW_SAMPLE_SIZE)) {
			list.createEl('li', {text: generateFilenameFromOutline(outline)});
		}
		if (count > PREVIEW_SAMPLE_SIZE) {
			list.createEl('li', {text: `and ${count - PREVIEW_SAMPLE_SIZE} more`});
		}
	}

	private renderNoTemplates(): void {
		this.contentEl.createDiv({
			cls: 'opml-import-error',
			text: 'No templates found. Enable the core Templates plugin (Settings → Core plugins) and set a template folder, or install Templater and set its template folder. Then add a Markdown note to that folder using placeholders such as {{title}} and {{xmlUrl}}.',
		});
		new Setting(this.contentEl).addButton((button) =>
			button
				.setButtonText('Close')
				.setCta()
				.onClick(() => this.close()),
		);
	}

	async runImport(): Promise<void> {
		const {templateFile, outlines} = this;
		if (!this.canImport() || !templateFile) return;

		this.importing = true;
		this.importError = '';
		this.refresh();
		try {
			// The vault may have changed since the destination was entered.
			const folderPath = matchExistingCase(this.app, this.folderPath);
			await ensureFolder(this.app, folderPath);
			const templateContent = await this.app.vault.read(templateFile);
			const context = createPlaceholderContext(await getCoreTemplateFormats(this.app));
			const {created, failed} = await createNotesFromOutlines(
				this.app,
				outlines,
				templateContent,
				folderPath,
				context,
			);

			const createdText = created.length === 1 ? '1 note' : `${created.length} notes`;
			new Notice(
				failed.length > 0
					? `Imported ${createdText}. ${failed.length} failed; see the developer console for details.`
					: `Imported ${createdText}.`,
			);
			this.close();
		} catch (error) {
			console.error('OPML import failed', error);
			this.importError = `Import failed: ${errorMessage(error)}`;
		} finally {
			this.importing = false;
			this.refresh();
		}
	}
}
