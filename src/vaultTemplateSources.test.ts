import type {App} from 'obsidian';
import {describe, expect, it} from 'vitest';
import {
	collectVaultTemplateFiles,
	getCoreTemplateFormats,
	getTemplateFolderSources,
	listMarkdownTemplatesInFolder,
} from './vaultTemplateSources';
import {createFakeVault, type FakeVaultOptions} from './test/fakeVault';
import {TFolder} from './test/obsidian-stub';

const appWith = (options: FakeVaultOptions) => createFakeVault(options).app as unknown as App;

const templater = (settings: Record<string, unknown>, enabled = true): FakeVaultOptions['config'] => ({
	'community-plugins.json': enabled ? ['templater-obsidian'] : [],
	'plugins/templater-obsidian/data.json': settings,
});

describe('getTemplateFolderSources', () => {
	it('reads the core Templates folder when the plugin is enabled (object format)', async () => {
		expect(await getTemplateFolderSources(appWith({templatesFolder: 'MyTemplates'}))).toEqual([
			{kind: 'core-templates', label: 'Core Templates', folderPath: 'MyTemplates'},
		]);
	});

	it('reads the core Templates folder when the plugin is enabled (array format)', async () => {
		const app = appWith({templatesFolder: 'T', config: {'core-plugins.json': ['file-explorer', 'templates']}});
		expect((await getTemplateFolderSources(app))[0]?.folderPath).toBe('T');
	});

	it('ignores the core Templates folder when the plugin is disabled', async () => {
		const objectFormat = appWith({templatesFolder: 'T', config: {'core-plugins.json': {templates: false}}});
		const arrayFormat = appWith({templatesFolder: 'T', config: {'core-plugins.json': ['file-explorer']}});
		expect(await getTemplateFolderSources(objectFormat)).toEqual([]);
		expect(await getTemplateFolderSources(arrayFormat)).toEqual([]);
	});

	it('ignores an empty or missing core Templates folder', async () => {
		expect(await getTemplateFolderSources(appWith({templatesFolder: '  '}))).toEqual([]);
		expect(await getTemplateFolderSources(appWith({config: {'templates.json': {}}}))).toEqual([]);
	});

	it('normalizes folder paths', async () => {
		expect((await getTemplateFolderSources(appWith({templatesFolder: '/Templates/'})))[0]?.folderPath).toBe(
			'Templates',
		);
	});

	it('reads the Templater templates_folder when Templater is enabled', async () => {
		const app = appWith({templatesFolder: null, config: templater({templates_folder: 'Templ'})});
		expect(await getTemplateFolderSources(app)).toEqual([{kind: 'templater', label: 'Templater', folderPath: 'Templ'}]);
	});

	it('falls back to the Templater folder setting', async () => {
		const app = appWith({templatesFolder: null, config: templater({folder: 'Alt'})});
		expect((await getTemplateFolderSources(app))[0]?.folderPath).toBe('Alt');
	});

	it('ignores Templater when it is disabled or has no folder', async () => {
		expect(
			await getTemplateFolderSources(appWith({templatesFolder: null, config: templater({templates_folder: 'T'}, false)})),
		).toEqual([]);
		expect(await getTemplateFolderSources(appWith({templatesFolder: null, config: templater({})}))).toEqual([]);
	});

	it('lists both sources and drops a duplicate folder', async () => {
		const both = appWith({templatesFolder: 'Core', config: templater({templates_folder: 'Templ'})});
		expect((await getTemplateFolderSources(both)).map((s) => s.kind)).toEqual(['core-templates', 'templater']);

		const shared = appWith({templatesFolder: 'Shared', config: templater({templates_folder: 'Shared/'})});
		expect(await getTemplateFolderSources(shared)).toHaveLength(1);
	});

	it('treats missing or malformed config files as not configured', async () => {
		const app = appWith({
			templatesFolder: null,
			config: {'community-plugins.json': {not: 'a list'}, 'plugins/templater-obsidian/data.json': ['x']},
		});
		expect(await getTemplateFolderSources(app)).toEqual([]);

		const vault = createFakeVault();
		vault.app.vault.adapter.read = () => Promise.resolve('{not json');
		expect(await getTemplateFolderSources(vault.app as unknown as App)).toEqual([]);
	});
});

describe('listMarkdownTemplatesInFolder', () => {
	const app = appWith({
		files: {'Templates/a.md': '', 'Templates/nested/b.md': '', 'Templates/c.opml': '', 'Other/x.md': '', 'root.md': ''},
	});

	it('returns markdown files under the folder, including nested ones', () => {
		expect(listMarkdownTemplatesInFolder(app, 'Templates').map((f) => f.path)).toEqual([
			'Templates/a.md',
			'Templates/nested/b.md',
		]);
	});

	it('does not match folders that share a prefix', () => {
		const prefixed = appWith({files: {'Templates/a.md': '', 'Templates-old/b.md': ''}});
		expect(listMarkdownTemplatesInFolder(prefixed, 'Templates').map((f) => f.path)).toEqual(['Templates/a.md']);
	});

	it('returns top-level files only for the vault root', () => {
		const root = createFakeVault({files: {'root.md': '', 'sub/x.md': ''}});
		const rootFolder = Object.assign(new TFolder(), {path: '/'});
		root.app.vault.getAbstractFileByPath = (p) => (p === '/' ? rootFolder : null);
		expect(listMarkdownTemplatesInFolder(root.app as unknown as App, '/').map((f) => f.path)).toEqual(['root.md']);
	});

	it('returns nothing when the folder is missing or is a file', () => {
		expect(listMarkdownTemplatesInFolder(app, 'nope')).toEqual([]);
		expect(listMarkdownTemplatesInFolder(app, 'root.md')).toEqual([]);
	});
});

describe('getCoreTemplateFormats', () => {
	it('reads the configured date and time formats', async () => {
		const app = appWith({config: {'templates.json': {folder: 'T', dateFormat: 'DD/MM/YYYY', timeFormat: 'h:mm A'}}});
		expect(await getCoreTemplateFormats(app)).toEqual({dateFormat: 'DD/MM/YYYY', timeFormat: 'h:mm A'});
	});

	it('falls back to the core Templates defaults', async () => {
		expect(await getCoreTemplateFormats(appWith({}))).toEqual({dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm'});
		const blank = appWith({config: {'templates.json': {dateFormat: '', timeFormat: 7}}});
		expect(await getCoreTemplateFormats(blank)).toEqual({dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm'});
	});
});

describe('collectVaultTemplateFiles', () => {
	it('merges templates from all sources with group labels', async () => {
		const app = appWith({
			templatesFolder: 'Core',
			config: templater({templates_folder: 'Templ'}),
			files: {'Core/one.md': '', 'Templ/two.md': ''},
		});
		expect((await collectVaultTemplateFiles(app)).map((o) => [o.file.path, o.groupLabel])).toEqual([
			['Core/one.md', 'Core Templates (Core)'],
			['Templ/two.md', 'Templater (Templ)'],
		]);
	});

	it('lists a template only once when folders overlap', async () => {
		const app = appWith({
			templatesFolder: 'T',
			config: templater({templates_folder: 'T/sub'}),
			files: {'T/sub/a.md': ''},
		});
		const options = await collectVaultTemplateFiles(app);
		expect(options).toHaveLength(1);
		expect(options[0]?.groupLabel).toBe('Core Templates (T)');
	});

	it('returns nothing when no template plugin is configured', async () => {
		expect(await collectVaultTemplateFiles(appWith({templatesFolder: null, files: {'T/a.md': ''}}))).toEqual([]);
	});
});
