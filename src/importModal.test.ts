import type {App} from 'obsidian';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {OpmlImportModal} from './importModal';
import {createFakeVault, PODCAST_OPML, type FakeVaultOptions} from './test/fakeVault';
import {notices} from './test/obsidian-stub';

/** `isOpen` is tracked by the test stub's Modal, not part of Obsidian's typings. */
const isOpen = (modal: OpmlImportModal) => (modal as unknown as {isOpen: boolean}).isOpen;

const TEMPLATE = '---\ntitle: {{title}}\nxmlUrl: {{xmlUrl}}\n---\n# {{title}}\n';

function setup(options: FakeVaultOptions = {}) {
	const vault = createFakeVault({
		files: {
			'Templates/Podcast.md': TEMPLATE,
			'Imports/podcasts.opml': PODCAST_OPML,
			...options.files,
		},
		folders: options.folders,
		templatesFolder: options.templatesFolder,
	});
	const modal = new OpmlImportModal(vault.app as unknown as App);
	modal.open();
	const el = modal.contentEl;

	const settingByName = (name: string) => {
		const setting = Array.from(el.querySelectorAll('.setting-item')).find(
			(s) => s.querySelector('.setting-item-name')?.textContent === name,
		);
		if (!setting) throw new Error(`No setting named ${name}`);
		return setting;
	};
	const button = (label: string) => {
		const found = Array.from(el.querySelectorAll('button')).find((b) => b.textContent === label);
		if (!found) throw new Error(`No button labelled ${label}`);
		return found;
	};
	const input = (name: string) => settingByName(name).querySelector('input') as HTMLInputElement;
	const select = () => settingByName('Template').querySelector('select') as HTMLSelectElement;
	const errorEl = () => el.querySelector('.opml-import-error') as HTMLElement;
	const previewEl = () => el.querySelector('.opml-import-preview') as HTMLElement;
	const isShown = (e: HTMLElement) => e.style.display !== 'none';

	const change = (target: HTMLInputElement | HTMLSelectElement, value: string) => {
		target.value = value;
		target.dispatchEvent(new Event('change'));
	};
	const fillForm = async (outline = 'Imports/podcasts.opml', template = 'Templates/Podcast.md', folder = '') => {
		change(input('Outline file'), outline);
		await vi.waitFor(() => expect(modal.outlines.length).toBeGreaterThan(0));
		change(select(), template);
		change(input('Destination folder'), folder);
	};

	return {vault, modal, el, button, input, select, errorEl, previewEl, isShown, change, fillForm};
}

describe('OpmlImportModal', () => {
	beforeEach(() => {
		notices.length = 0;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('rendering', () => {
		it('shows the title, form fields, and a disabled import button', () => {
			const {modal, el, button} = setup();
			expect(modal.titleEl.textContent).toBe('Import outlines');
			expect(modal.modalEl.classList.contains('opml-import-modal')).toBe(true);
			expect(el.textContent).toContain('Outline file');
			expect(el.textContent).toContain('Template');
			expect(el.textContent).toContain('Destination folder');
			expect(button('Import').disabled).toBe(true);
		});

		it('groups templates by source folder', () => {
			const {select} = setup({files: {'Templates/Sub/Other.md': 'x'}});
			const group = select().querySelector('optgroup');
			expect(group?.getAttribute('label')).toBe('Core Templates (Templates)');
			expect(Array.from(group?.querySelectorAll('option') ?? []).map((o) => o.value)).toEqual([
				'Templates/Podcast.md',
				'Templates/Sub/Other.md',
			]);
			expect(select().querySelector('option')?.value).toBe('');
		});

		it('hides the preview and error until there is something to show', () => {
			const {previewEl, errorEl, isShown} = setup();
			expect(isShown(previewEl())).toBe(false);
			expect(isShown(errorEl())).toBe(false);
		});

		it('explains how to add templates when none are configured', () => {
			const {el, modal, button} = setup({templatesFolder: null});
			expect(el.querySelector('.opml-import-error')?.textContent).toContain('No templates found');
			expect(el.querySelector('input')).toBeNull();
			button('Close').click();
			expect(isOpen(modal)).toBe(false);
		});

		it('empties the content when closed', () => {
			const {modal, button} = setup();
			button('Cancel').click();
			expect(isOpen(modal)).toBe(false);
			expect(modal.contentEl.childElementCount).toBe(0);
		});
	});

	describe('outline file', () => {
		it('loads entries and previews the notes to be created', async () => {
			const {modal, input, change, previewEl, isShown} = setup();
			change(input('Outline file'), ' Imports/podcasts.opml ');
			await vi.waitFor(() => expect(modal.outlines).toHaveLength(3));
			expect(isShown(previewEl())).toBe(true);
			expect(previewEl().textContent).toContain('3 notes will be created in the vault root.');
			expect(Array.from(previewEl().querySelectorAll('li')).map((li) => li.textContent)).toEqual([
				'Connected',
				'Mac Power Users',
				'Ask A Show',
			]);
		});

		it('limits the preview list and summarizes the rest', async () => {
			const outlines = Array.from({length: 8}, (_, i) => `<outline text="Show ${i}"/>`).join('');
			const {modal, previewEl} = setup({files: {'big.opml': `<opml><body>${outlines}</body></opml>`}});
			await modal.selectOutlineFile('big.opml');
			const items = Array.from(previewEl().querySelectorAll('li')).map((li) => li.textContent);
			expect(items).toHaveLength(6);
			expect(items[5]).toBe('and 3 more');
		});

		it('uses singular wording for a single note', async () => {
			const {modal, previewEl} = setup({files: {'one.opml': '<opml><body><outline text="Solo"/></body></opml>'}});
			await modal.selectOutlineFile('one.opml');
			expect(previewEl().textContent).toContain('1 note will be created');
		});

		it('accepts .xml files', async () => {
			const {modal} = setup({files: {'feeds.XML': PODCAST_OPML}});
			await modal.selectOutlineFile('feeds.XML');
			expect(modal.outlines).toHaveLength(3);
		});

		it('reports a path that is missing or not an outline file', async () => {
			const {modal, errorEl, isShown} = setup();
			await modal.selectOutlineFile('nope.opml');
			expect(errorEl().textContent).toBe('No .opml or .xml file exists at that path.');
			expect(isShown(errorEl())).toBe(true);
			await modal.selectOutlineFile('Templates/Podcast.md');
			expect(modal.outlineFile).toBeNull();
			expect(errorEl().textContent).toBe('No .opml or .xml file exists at that path.');
		});

		it('reports a file that cannot be parsed', async () => {
			const {modal, errorEl, button} = setup({files: {'bad.opml': 'not xml'}});
			await modal.selectOutlineFile('bad.opml');
			expect(errorEl().textContent).toBe('Could not read the outline file: The file is not valid XML.');
			expect(modal.outlines).toEqual([]);
			expect(button('Import').disabled).toBe(true);
		});

		it('reports a file with no importable entries', async () => {
			const {modal, errorEl} = setup({files: {'empty.opml': '<opml><body/></opml>'}});
			await modal.selectOutlineFile('empty.opml');
			expect(errorEl().textContent).toBe('No outline entries found in this file.');
		});

		it('clears the selection and error when the path is emptied', async () => {
			const {modal, errorEl, isShown} = setup();
			await modal.selectOutlineFile('nope.opml');
			await modal.selectOutlineFile('   ');
			expect(modal.outlineFile).toBeNull();
			expect(isShown(errorEl())).toBe(false);
		});
	});

	describe('browse', () => {
		it('selects the only outline file in the vault', async () => {
			const {modal, button, input} = setup();
			button('Browse').click();
			await vi.waitFor(() => expect(modal.outlines).toHaveLength(3));
			expect(input('Outline file').value).toBe('Imports/podcasts.opml');
		});

		it('asks for a path when there are several outline files', () => {
			const {modal, button} = setup({files: {'second.xml': PODCAST_OPML}});
			button('Browse').click();
			expect(notices).toEqual(['Found 2 outline files. Enter the path of the one to import.']);
			expect(modal.outlineFile).toBeNull();
		});

		it('reports when there are no outline files', () => {
			const vault = createFakeVault({files: {'Templates/Podcast.md': TEMPLATE}});
			const modal = new OpmlImportModal(vault.app as unknown as App);
			modal.open();
			Array.from(modal.contentEl.querySelectorAll('button'))
				.find((b) => b.textContent === 'Browse')
				?.click();
			expect(notices).toEqual(['No .opml or .xml files found in the vault.']);
		});
	});

	describe('template and destination', () => {
		it('enables import once a file and template are chosen', async () => {
			const {fillForm, button, modal} = setup();
			await fillForm();
			expect(modal.templateFile?.path).toBe('Templates/Podcast.md');
			expect(button('Import').disabled).toBe(false);
		});

		it('disables import again when the template is cleared', async () => {
			const {fillForm, change, select, button, modal} = setup();
			await fillForm();
			change(select(), '');
			expect(modal.templateFile).toBeNull();
			expect(button('Import').disabled).toBe(true);
		});

		it('previews an existing destination folder', async () => {
			const {fillForm, previewEl} = setup({folders: ['Podcasts']});
			await fillForm(undefined, undefined, '/Podcasts/');
			expect(previewEl().textContent).toContain('3 notes will be created in Podcasts.');
			expect(previewEl().textContent).not.toContain('The folder');
		});

		it('previews that a missing destination folder will be created', async () => {
			const {fillForm, previewEl, button} = setup();
			await fillForm(undefined, undefined, 'New/Shows');
			expect(previewEl().textContent).toContain('The folder New/Shows will be created.');
			expect(button('Import').disabled).toBe(false);
		});

		it('rejects a destination that is a file', async () => {
			const {fillForm, errorEl, button} = setup();
			await fillForm(undefined, undefined, 'Templates/Podcast.md');
			expect(errorEl().textContent).toBe('"Templates/Podcast.md" is a file, not a folder.');
			expect(button('Import').disabled).toBe(true);
		});
	});

	describe('import', () => {
		it('creates rendered notes, reports success, and closes', async () => {
			const {fillForm, button, vault, modal} = setup({folders: ['Podcasts']});
			await fillForm(undefined, undefined, 'Podcasts');
			button('Import').click();
			await vi.waitFor(() => expect(isOpen(modal)).toBe(false));

			expect([...vault.files.keys()].filter((p) => p.startsWith('Podcasts/'))).toEqual([
				'Podcasts/Connected.md',
				'Podcasts/Mac Power Users.md',
				'Podcasts/Ask A Show.md',
			]);
			expect(vault.files.get('Podcasts/Ask A Show.md')).toBe(
				'---\ntitle: "Ask: A Show"\nxmlUrl: "https://example.com/ask.xml"\n---\n# Ask: A Show\n',
			);
			expect(vault.files.has('Podcasts/feeds.md')).toBe(false);
			expect(notices).toEqual(['Imported 3 notes.']);
		});

		it('creates a missing destination folder first', async () => {
			const {fillForm, modal, vault} = setup();
			await fillForm(undefined, undefined, 'New/Shows');
			await modal.runImport();
			expect(vault.createFolder.mock.calls.map(([p]) => p)).toEqual(['New', 'New/Shows']);
			expect(vault.files.has('New/Shows/Connected.md')).toBe(true);
		});

		it('never overwrites existing notes', async () => {
			const {fillForm, modal, vault} = setup({files: {'Connected.md': 'mine'}});
			await fillForm();
			await modal.runImport();
			expect(vault.files.get('Connected.md')).toBe('mine');
			expect(vault.files.has('Connected 1.md')).toBe(true);
		});

		it('reports per-note failures in the notice', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const {fillForm, modal, vault} = setup();
			await fillForm();
			vault.create.mockRejectedValueOnce(new Error('nope'));
			await modal.runImport();
			expect(notices).toEqual(['Imported 2 notes. 1 failed; see the developer console for details.']);
			expect(isOpen(modal)).toBe(false);
		});

		it('uses singular wording for one note', async () => {
			const {fillForm, modal} = setup({files: {'one.opml': '<opml><body><outline text="Solo"/></body></opml>'}});
			await fillForm('one.opml');
			await modal.runImport();
			expect(notices).toEqual(['Imported 1 note.']);
		});

		it('keeps the modal open and shows the error when the import fails', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const {fillForm, modal, vault, errorEl, button} = setup();
			await fillForm(undefined, undefined, 'New');
			vault.createFolder.mockRejectedValueOnce(new Error('read-only vault'));
			await modal.runImport();
			expect(isOpen(modal)).toBe(true);
			expect(errorEl().textContent).toBe('Import failed: read-only vault');
			expect(button('Import').disabled).toBe(false);
			expect(notices).toEqual([]);
		});

		it('clears a previous import error when the form changes', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const {fillForm, modal, vault, errorEl, isShown} = setup();
			await fillForm(undefined, undefined, 'New');
			vault.createFolder.mockRejectedValueOnce(new Error('read-only vault'));
			await modal.runImport();
			modal.setDestination('');
			expect(isShown(errorEl())).toBe(false);
		});

		it('does nothing when the form is incomplete', async () => {
			const {modal, vault} = setup();
			await modal.runImport();
			expect(vault.create).not.toHaveBeenCalled();
			expect(isOpen(modal)).toBe(true);
		});

		it('ignores a second click while an import is running', async () => {
			const {fillForm, modal, vault, button} = setup();
			await fillForm();
			const first = modal.runImport();
			expect(button('Import').disabled).toBe(true);
			await modal.runImport();
			await first;
			expect(vault.create).toHaveBeenCalledTimes(3);
		});
	});
});
