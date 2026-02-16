import {App, Modal, Notice, TFile, TFolder} from 'obsidian';
import OpmlImportPlugin from './main';
import {OpmlTemplate} from './settings';
import * as opml from 'opml';

export interface OpmlOutline {
	title?: string;
	text?: string;
	type?: string;
	xmlUrl?: string;
	htmlUrl?: string;
	created?: string;
	category?: string;
	outline?: OpmlOutline[];
}

export class OpmlImportModal extends Modal {
	plugin: OpmlImportPlugin;
	selectedFile: TFile | null = null;
	selectedTemplate: OpmlTemplate | null = null;
	selectedFolder: TFolder | null = null;
	errorMessage: string = '';

	constructor(app: App, plugin: OpmlImportPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();

		contentEl.createEl('h2', {text: 'Import OPML File'});

		// Check if templates exist
		if (this.plugin.settings.templates.length === 0) {
			contentEl.createEl('div', {
				cls: 'opml-import-error',
				text: 'No templates available. Please create at least one template in the plugin settings first.'
			});
			return;
		}

		// File selection
		const fileSetting = contentEl.createDiv('opml-import-setting');
		fileSetting.createEl('label', {text: 'OPML File', cls: 'opml-import-label'});
		const fileInputContainer = fileSetting.createDiv('file-input-container');
		
		// File path input
		const fileInput = fileInputContainer.createEl('input', {
			type: 'text',
			placeholder: 'Enter OPML file path (e.g., folder/file.opml)',
			cls: 'opml-import-input'
		});
		fileInput.style.width = '100%';
		fileInput.value = this.selectedFile ? this.selectedFile.path : '';

		// Browse button
		const browseButton = fileInputContainer.createEl('button', {
			text: 'Browse',
			cls: 'mod-cta'
		});
		// Note: browseButton handler will be set up after updateImportButton is defined

		// Template selection
		const templateSetting = contentEl.createDiv('opml-import-setting');
		templateSetting.createEl('label', {text: 'Template', cls: 'opml-import-label'});
		const templateSelect = templateSetting.createEl('select', {cls: 'opml-import-select'});
		
		// Add empty option
		const emptyOption = templateSelect.createEl('option', {text: 'Select a template...', value: ''});
		emptyOption.selected = true;

		// Add template options
		this.plugin.settings.templates.forEach(template => {
			const option = templateSelect.createEl('option', {
				text: template.name,
				value: template.id
			});
			if (this.selectedTemplate && template.id === this.selectedTemplate.id) {
				option.selected = true;
			}
		});


		// Folder selection
		const folderSetting = contentEl.createDiv('opml-import-setting');
		folderSetting.createEl('label', {text: 'Destination Folder', cls: 'opml-import-label'});
		const folderInputContainer = folderSetting.createDiv('folder-input-container');
		
		// Folder path input
		const folderInput = folderInputContainer.createEl('input', {
			type: 'text',
			placeholder: 'Enter folder path (leave empty for root)',
			cls: 'opml-import-input'
		});
		folderInput.style.width = '100%';
		folderInput.value = this.selectedFolder && this.selectedFolder.path !== '/' ? this.selectedFolder.path : '';
		

		// Set default to root folder
		if (!this.selectedFolder) {
			this.selectedFolder = this.app.vault.getRoot();
		}

		// Error display
		const errorDiv = contentEl.createDiv('opml-import-error');
		errorDiv.style.display = this.errorMessage ? 'block' : 'none';
		errorDiv.textContent = this.errorMessage;

		// Import button
		const buttonContainer = contentEl.createDiv('opml-import-buttons');
		const importButton = buttonContainer.createEl('button', {
			text: 'Import',
			cls: 'mod-cta'
		});
		
		// Update button state based on form validity
		const updateImportButton = () => {
			const isValid = this.selectedFile !== null && 
			                this.selectedTemplate !== null && 
			                this.selectedFolder !== null;
			importButton.disabled = !isValid;
		};
		
		// Set up event handlers
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
			const selectedId = templateSelect.value;
			this.selectedTemplate = this.plugin.settings.templates.find(t => t.id === selectedId) || null;
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
		
		// Set up browse button handler
		browseButton.onclick = () => {
			const files = this.app.vault.getFiles().filter(f => f.extension === 'opml' || f.extension === 'xml');
			if (files.length === 0) {
				new Notice('No OPML files found in vault');
				return;
			}
			// Show a simple selection - in a real implementation, you'd use a proper file picker
			// For now, use the first file or allow manual entry
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
		
		// Initial state
		updateImportButton();
		
		importButton.onclick = async () => {
			await this.performImport();
		};

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelButton.onclick = () => {
			this.close();
		};
	}

	private updateErrorDisplay(): void {
		const errorDiv = this.contentEl.querySelector('.opml-import-error') as HTMLElement;
		if (errorDiv) {
			errorDiv.textContent = this.errorMessage;
			errorDiv.style.display = this.errorMessage ? 'block' : 'none';
		}
	}

	private async performImport(): Promise<void> {
		// Validate inputs
		if (!this.selectedFile) {
			this.errorMessage = 'Please select an OPML file';
			this.updateErrorDisplay();
			return;
		}

		if (!this.selectedTemplate) {
			this.errorMessage = 'Please select a template';
			this.updateErrorDisplay();
			return;
		}

		if (!this.selectedFolder) {
			this.errorMessage = 'Please select a destination folder';
			this.updateErrorDisplay();
			return;
		}

		try {
			// Read and parse OPML file
			const opmlContent = await this.app.vault.read(this.selectedFile);
			
			// Parse OPML using the opml package
			const outline = await this.parseOpml(opmlContent);
			
			if (!outline) {
				this.errorMessage = 'Invalid OPML file format';
				this.updateErrorDisplay();
				return;
			}

			// Process outlines recursively
			// Handle OPML structure: the parsed outline might have a body property
			let rootOutline = outline;
			if ('body' in outline && outline.body && typeof outline.body === 'object') {
				// If body exists and has outlines, use those
				const body = outline.body as any;
				if (body.outline) {
					rootOutline = body.outline as OpmlOutline;
				} else {
					rootOutline = body as OpmlOutline;
				}
			}
			const outlines = this.flattenOutlines(rootOutline);
			
			// Create notes for each outline entry
			let successCount = 0;
			let errorCount = 0;

			for (const item of outlines) {
				try {
					await this.createNoteFromOutline(item, this.selectedTemplate, this.selectedFolder);
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

	private parseOpml(opmlContent: string): Promise<OpmlOutline | null> {
		return new Promise((resolve, reject) => {
			try {
				opml.parse(opmlContent, (err: Error | null, outline: OpmlOutline) => {
					if (err) {
						reject(err);
						return;
					}
					resolve(outline);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	private flattenOutlines(outline: OpmlOutline): OpmlOutline[] {
		const result: OpmlOutline[] = [];
		
		// Add current outline if it has meaningful content
		if (outline.text || outline.title || outline.xmlUrl) {
			result.push(outline);
		}

		// Recursively process child outlines
		if (outline.outline && Array.isArray(outline.outline)) {
			for (const child of outline.outline) {
				result.push(...this.flattenOutlines(child));
			}
		}

		return result;
	}

	private async createNoteFromOutline(
		outline: OpmlOutline,
		template: OpmlTemplate,
		folder: TFolder
	): Promise<void> {
		// Render template with outline data
		const frontmatter = this.renderTemplate(template.frontmatter, outline);
		const body = this.renderTemplate(template.body, outline);

		// Combine frontmatter and body
		let content = '';
		if (frontmatter.trim()) {
			// Ensure frontmatter has proper YAML delimiters
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

		// Generate filename from title or text
		const filename = this.generateFilename(outline);
		const filePath = folder.path === '/' 
			? `${filename}.md` 
			: `${folder.path}/${filename}.md`;

		// Check if file already exists and add suffix if needed
		let finalPath = filePath;
		let counter = 1;
		while (await this.app.vault.adapter.exists(finalPath)) {
			const baseName = filename + (counter > 1 ? `-${counter - 1}` : '');
			finalPath = folder.path === '/' 
				? `${baseName}-${counter}.md` 
				: `${folder.path}/${baseName}-${counter}.md`;
			counter++;
		}

		// Create the note
		await this.app.vault.create(finalPath, content);
	}

	private renderTemplate(template: string, outline: OpmlOutline): string {
		let result = template;

		// Replace placeholders with outline values
		result = result.replace(/\{\{title\}\}/g, outline.title || outline.text || '');
		result = result.replace(/\{\{text\}\}/g, outline.text || outline.title || '');
		result = result.replace(/\{\{xmlUrl\}\}/g, outline.xmlUrl || '');
		result = result.replace(/\{\{htmlUrl\}\}/g, outline.htmlUrl || '');
		result = result.replace(/\{\{type\}\}/g, outline.type || '');
		result = result.replace(/\{\{created\}\}/g, outline.created || '');
		result = result.replace(/\{\{category\}\}/g, outline.category || '');

		return result;
	}

	private generateFilename(outline: OpmlOutline): string {
		// Use title or text for filename, sanitize it
		const name = outline.title || outline.text || 'Untitled';
		// Remove invalid filename characters and limit length
		return name
			.replace(/[<>:"/\\|?*]/g, '')
			.replace(/\s+/g, '-')
			.substring(0, 100)
			.trim() || 'Untitled';
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
