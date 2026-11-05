import type {App} from 'obsidian';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {
	createNotesFromOutlines,
	ensureFolder,
	findAvailableNotePath,
	getFolderStatus,
	joinVaultPath,
	normalizeFolderPath,
} from './importNotes';
import {createFakeVault} from './test/fakeVault';

const asApp = (app: unknown) => app as App;

describe('normalizeFolderPath', () => {
	it('maps empty input and slash to the vault root', () => {
		expect(normalizeFolderPath('')).toBe('');
		expect(normalizeFolderPath('   ')).toBe('');
		expect(normalizeFolderPath('/')).toBe('');
		expect(normalizeFolderPath('//')).toBe('');
	});

	it('trims whitespace and stray slashes', () => {
		expect(normalizeFolderPath(' /Podcasts/Tech/ ')).toBe('Podcasts/Tech');
		expect(normalizeFolderPath('Podcasts//Tech')).toBe('Podcasts/Tech');
	});
});

describe('joinVaultPath', () => {
	it('joins at the root and in a folder', () => {
		expect(joinVaultPath('', 'A.md')).toBe('A.md');
		expect(joinVaultPath('Podcasts', 'A.md')).toBe('Podcasts/A.md');
	});
});

describe('getFolderStatus', () => {
	const {app} = createFakeVault({files: {'Notes/file.md': ''}});

	it('treats the root as existing', () => {
		expect(getFolderStatus(asApp(app), '')).toBe('exists');
	});

	it('reports existing, missing, and file paths', () => {
		expect(getFolderStatus(asApp(app), 'Notes')).toBe('exists');
		expect(getFolderStatus(asApp(app), 'Missing')).toBe('missing');
		expect(getFolderStatus(asApp(app), 'Notes/file.md')).toBe('not-a-folder');
	});
});

describe('ensureFolder', () => {
	it('does nothing for the root or an existing folder', async () => {
		const vault = createFakeVault({folders: ['Podcasts']});
		await ensureFolder(asApp(vault.app), '');
		await ensureFolder(asApp(vault.app), 'Podcasts');
		expect(vault.createFolder).not.toHaveBeenCalled();
	});

	it('creates missing folders one level at a time', async () => {
		const vault = createFakeVault({folders: ['A']});
		await ensureFolder(asApp(vault.app), 'A/B/C');
		expect(vault.createFolder.mock.calls.map(([p]) => p)).toEqual(['A/B', 'A/B/C']);
	});

	it('throws when part of the path is a file', async () => {
		const vault = createFakeVault({files: {'A/B': 'x'}});
		await expect(ensureFolder(asApp(vault.app), 'A/B/C')).rejects.toThrow('"A/B" is a file');
		expect(vault.createFolder).not.toHaveBeenCalled();
	});
});

describe('findAvailableNotePath', () => {
	const takenIn = (paths: string[]) => (p: string) => paths.includes(p);

	it('uses the plain name when free', () => {
		expect(findAvailableNotePath('F', 'Show', takenIn([]))).toBe('F/Show.md');
	});

	it('adds an increasing number when the name is taken', () => {
		expect(findAvailableNotePath('F', 'Show', takenIn(['F/Show.md']))).toBe('F/Show 1.md');
		expect(findAvailableNotePath('F', 'Show', takenIn(['F/Show.md', 'F/Show 1.md', 'F/Show 2.md']))).toBe(
			'F/Show 3.md',
		);
	});

	it('works at the vault root', () => {
		expect(findAvailableNotePath('', 'Show', takenIn(['Show.md']))).toBe('Show 1.md');
	});
});

describe('createNotesFromOutlines', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('creates one rendered note per outline', async () => {
		const vault = createFakeVault({folders: ['Podcasts']});
		const result = await createNotesFromOutlines(
			asApp(vault.app),
			[{text: 'A', xmlUrl: 'http://a'}, {text: 'B'}],
			'---\nurl: {{xmlUrl}}\n---\n# {{title}}',
			'Podcasts',
		);
		expect(result).toEqual({created: ['Podcasts/A.md', 'Podcasts/B.md'], failed: []});
		expect(vault.files.get('Podcasts/A.md')).toBe('---\nurl: "http://a"\n---\n# A');
	});

	it('numbers duplicates within one import and against existing notes', async () => {
		const vault = createFakeVault({files: {'Show.md': 'existing'}});
		const result = await createNotesFromOutlines(asApp(vault.app), [{text: 'Show'}, {text: 'Show'}], '{{title}}', '');
		expect(result.created).toEqual(['Show 1.md', 'Show 2.md']);
		expect(vault.files.get('Show.md')).toBe('existing');
	});

	it('treats names that differ only by case as taken', async () => {
		const vault = createFakeVault({files: {'Podcasts/show.md': 'existing'}});
		const result = await createNotesFromOutlines(asApp(vault.app), [{text: 'Show'}], '{{title}}', 'Podcasts');
		expect(result).toEqual({created: ['Podcasts/Show 1.md'], failed: []});
	});

	it('records a failure and continues with the remaining outlines', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const vault = createFakeVault();
		vault.create.mockRejectedValueOnce(new Error('disk full'));
		const result = await createNotesFromOutlines(asApp(vault.app), [{text: 'A'}, {text: 'B'}], '{{title}}', '');
		expect(result.created).toEqual(['B.md']);
		expect(result.failed).toEqual([{name: 'A', error: new Error('disk full')}]);
		expect(console.error).toHaveBeenCalled();
	});
});
