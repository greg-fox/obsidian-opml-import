import {App, PluginSettingTab, Setting} from "obsidian";
import OpmlImportPlugin from "./main";

export interface OpmlTemplate {
	id: string;
	name: string;
	frontmatter: string;
	body: string;
}

export interface OpmlImportSettings {
	templates: OpmlTemplate[];
}

export const DEFAULT_SETTINGS: OpmlImportSettings = {
	templates: []
}

export class OpmlImportSettingTab extends PluginSettingTab {
	plugin: OpmlImportPlugin;

	constructor(app: App, plugin: OpmlImportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'OPML Import Settings'});

		// Templates section
		containerEl.createEl('h3', {text: 'Templates'});
		containerEl.createEl('p', {
			text: 'Create templates for importing OPML entries. Use placeholders like {{title}}, {{text}}, {{xmlUrl}}, {{htmlUrl}}, {{type}}, {{created}}, {{category}} to insert OPML element values.'
		});

		// Display existing templates
		const templatesContainer = containerEl.createDiv('templates-container');
		this.renderTemplates(templatesContainer);

		// Add new template button
		new Setting(containerEl)
			.setName('Add Template')
			.setDesc('Create a new template for OPML imports')
			.addButton(button => button
				.setButtonText('Add Template')
				.setCta()
				.onClick(() => {
					this.addNewTemplate();
				}));
	}

	private renderTemplates(container: HTMLElement): void {
		container.empty();

		if (this.plugin.settings.templates.length === 0) {
			container.createEl('p', {
				text: 'No templates created yet. Click "Add Template" to create one.',
				cls: 'no-templates-message'
			});
			return;
		}

		this.plugin.settings.templates.forEach((template, index) => {
			const templateDiv = container.createDiv('template-item');
			// Track which textarea in this template to insert into (last focused)
			let targetTextarea: HTMLTextAreaElement | null = null;

			const insertAtCursor = (textarea: HTMLTextAreaElement, value: string) => {
				const start = textarea.selectionStart;
				const end = textarea.selectionEnd;
				const current = textarea.value;
				textarea.value = current.substring(0, start) + value + current.substring(end);
				textarea.selectionStart = textarea.selectionEnd = start + value.length;
				textarea.dispatchEvent(new Event('input', { bubbles: true }));
				textarea.focus(); // keep focus so user can keep editing and use quick-insert again
			};

			// Template name
			new Setting(templateDiv)
				.setName('Template Name')
				.addText(text => text
					.setPlaceholder('My Template')
					.setValue(template.name)
					.onChange(async (value) => {
						template.name = value;
						await this.plugin.saveSettings();
					}));

			// Frontmatter editor
			new Setting(templateDiv)
				.setName('Frontmatter (YAML)')
				.setDesc('YAML frontmatter for the note. Use {{placeholders}} for OPML values.')
				.addTextArea(text => {
					text
						.setPlaceholder('---\ntitle: {{title}}\ncreated: {{created}}\n---')
						.setValue(template.frontmatter)
						.onChange(async (value) => {
							template.frontmatter = value;
							await this.plugin.saveSettings();
						});
					text.inputEl.rows = 6;
					text.inputEl.style.width = '100%';
					text.inputEl.addEventListener('focus', () => { targetTextarea = text.inputEl; });
					return text;
				});

			// Body editor
			new Setting(templateDiv)
				.setName('Body Content')
				.setDesc('Note body content. Use {{placeholders}} for OPML values.')
				.addTextArea(text => {
					text
						.setPlaceholder('# {{title}}\n\n{{text}}\n\nURL: {{xmlUrl}}')
						.setValue(template.body)
						.onChange(async (value) => {
							template.body = value;
							await this.plugin.saveSettings();
						});
					text.inputEl.rows = 8;
					text.inputEl.style.width = '100%';
					text.inputEl.addEventListener('focus', () => { targetTextarea = text.inputEl; });
					return text;
				});

			// Placeholder helper buttons
			const placeholderDiv = templateDiv.createDiv('placeholder-helpers');
			placeholderDiv.createEl('span', {text: 'Quick insert: '});
			const placeholders = [
				{label: 'Title', value: '{{title}}'},
				{label: 'Text', value: '{{text}}'},
				{label: 'XML URL', value: '{{xmlUrl}}'},
				{label: 'HTML URL', value: '{{htmlUrl}}'},
				{label: 'Type', value: '{{type}}'},
				{label: 'Created', value: '{{created}}'},
				{label: 'Category', value: '{{category}}'}
			];

			placeholders.forEach(ph => {
				const btn = placeholderDiv.createEl('button', {
					text: ph.label,
					cls: 'placeholder-button'
				});
				btn.type = 'button'; // prevent form submit
				btn.onclick = (e) => {
					e.preventDefault();
					// Prefer the textarea we last focused in this template; fallback to activeElement
					const textarea = targetTextarea ?? (document.activeElement instanceof HTMLTextAreaElement ? document.activeElement : null);
					if (textarea && templateDiv.contains(textarea)) {
						insertAtCursor(textarea, ph.value);
					} else if (targetTextarea) {
						insertAtCursor(targetTextarea, ph.value);
					}
				};
			});

			// Delete button
			new Setting(templateDiv)
				.addButton(button => button
					.setButtonText('Delete')
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.templates.splice(index, 1);
						await this.plugin.saveSettings();
						this.renderTemplates(container);
					}));

			templateDiv.createEl('hr');
		});
	}

	private async addNewTemplate(): Promise<void> {
		const newTemplate: OpmlTemplate = {
			id: Date.now().toString(),
			name: `Template ${this.plugin.settings.templates.length + 1}`,
			frontmatter: '---\ntitle: {{title}}\n---',
			body: '# {{title}}\n\n{{text}}'
		};

		this.plugin.settings.templates.push(newTemplate);
		await this.plugin.saveSettings();
		
		const container = this.containerEl.querySelector('.templates-container') as HTMLElement;
		if (container) {
			this.renderTemplates(container);
		}
	}
}
