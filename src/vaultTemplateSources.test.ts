/* eslint-disable obsidianmd/no-tfile-tfolder-cast -- test doubles use prototype inheritance */
import {TFile, TFolder} from 'obsidian';
import type {App} from 'obsidian';
import {describe, expect, it} from 'vitest';
import {
	collectVaultTemplateFiles,
	getTemplateFolderSources,
	listMarkdownTemplatesInFolder,
} from './vaultTemplateSources';

function mkFile(path: string): TFile {
	const f = Object.create(TFile.prototype) as TFile;
	f.path = path;
	f.basename = path.split('/').pop() ?? path;
	f.extension = 'md';
	return f;
}

function mkFolder(path: string): TFolder {
	const f = Object.create(TFolder.prototype) as TFolder;
	f.path = path;
	return f;
}

function mkApp(overrides: Partial<App> & {vault: App['vault']}): App {
	return overrides as App;
}

describe('getTemplateFolderSources', () => {
	it('reads core Templates folder from object-based internal plugins', () => {
		const app = mkApp({
			internalPlugins: {
				plugins: {
					templates: {
						enabled: true,
						instance: {options: {folder: 'ObjTemplates'}},
					},
				},
			},
			vault: {getAbstractFileByPath: () => null, getMarkdownFiles: () => []},
		} as unknown as App);
		expect(getTemplateFolderSources(app)[0]?.folderPath).toBe('ObjTemplates');
	});

	it('reads core Templates folder from Map-based internal plugins', () => {
		const plugins = new Map();
		plugins.set('templates', {
			enabled: true,
			instance: {options: {folder: 'MyTemplates'}},
		});
		const app = mkApp({
			internalPlugins: {plugins},
			vault: {getAbstractFileByPath: () => null, getMarkdownFiles: () => []},
		} as unknown as App);
		const sources = getTemplateFolderSources(app);
		expect(sources).toEqual([
			{kind: 'core-templates', label: 'Core Templates', folderPath: 'MyTemplates'},
		]);
	});

	it('reads Templater templates_folder', () => {
		const app = mkApp({
			internalPlugins: {plugins: new Map()},
			plugins: {
				plugins: {
					'templater-obsidian': {settings: {templates_folder: 'Templ'}},
				},
			},
			vault: {getAbstractFileByPath: () => null, getMarkdownFiles: () => []},
		} as unknown as App);
		expect(getTemplateFolderSources(app)).toEqual([
			{kind: 'templater', label: 'Templater', folderPath: 'Templ'},
		]);
	});

	it('dedupes same folder path from core and templater', () => {
		const plugins = new Map();
		plugins.set('templates', {
			enabled: true,
			instance: {options: {folder: 'Shared'}},
		});
		const app = mkApp({
			internalPlugins: {plugins},
			plugins: {
				plugins: {
					'templater-obsidian': {settings: {templates_folder: 'Shared'}},
				},
			},
			vault: {getAbstractFileByPath: () => null, getMarkdownFiles: () => []},
		} as unknown as App);
		expect(getTemplateFolderSources(app)).toHaveLength(1);
	});

	it('falls back to templater settings.folder', () => {
		const app = mkApp({
			internalPlugins: {plugins: new Map()},
			plugins: {
				plugins: {
					'templater-obsidian': {settings: {folder: 'Alt'}},
				},
			},
			vault: {getAbstractFileByPath: () => null, getMarkdownFiles: () => []},
		} as unknown as App);
		expect(getTemplateFolderSources(app)[0]?.folderPath).toBe('Alt');
	});
});

describe('listMarkdownTemplatesInFolder', () => {
	it('returns markdown files under folder path', () => {
		const folder = mkFolder('Templates');
		const app = mkApp({
			vault: {
				getAbstractFileByPath: (p: string) => (p === 'Templates' ? folder : null),
				getMarkdownFiles: () => [
					mkFile('Templates/a.md'),
					mkFile('Templates/nested/b.md'),
					mkFile('Other/x.md'),
				],
			},
		} as unknown as App);
		const files = listMarkdownTemplatesInFolder(app, 'Templates');
		expect(files.map((f) => f.path).sort()).toEqual(['Templates/a.md', 'Templates/nested/b.md']);
	});

	it('returns top-level files only for vault root folder', () => {
		const root = mkFolder('');
		const app = mkApp({
			vault: {
				getAbstractFileByPath: (p: string) => (p === '' ? root : null),
				getMarkdownFiles: () => [mkFile('root.md'), mkFile('sub/x.md')],
			},
		} as unknown as App);
		const files = listMarkdownTemplatesInFolder(app, '');
		expect(files.map((f) => f.path)).toEqual(['root.md']);
	});

	it('returns empty when folder missing', () => {
		const app = mkApp({
			vault: {
				getAbstractFileByPath: () => null,
				getMarkdownFiles: () => [],
			},
		} as unknown as App);
		expect(listMarkdownTemplatesInFolder(app, 'nope')).toEqual([]);
	});
});

describe('collectVaultTemplateFiles', () => {
	it('merges files from sources with group labels', () => {
		const plugins = new Map();
		plugins.set('templates', {
			enabled: true,
			instance: {options: {folder: 'T'}},
		});
		const folder = mkFolder('T');
		const f1 = mkFile('T/one.md');
		const app = mkApp({
			internalPlugins: {plugins},
			vault: {
				getAbstractFileByPath: (p: string) => (p === 'T' ? folder : null),
				getMarkdownFiles: () => [f1],
			},
		} as unknown as App);
		const opts = collectVaultTemplateFiles(app);
		expect(opts).toHaveLength(1);
		expect(opts[0]?.file.path).toBe('T/one.md');
		expect(opts[0]?.groupLabel).toContain('Core Templates');
	});
});
