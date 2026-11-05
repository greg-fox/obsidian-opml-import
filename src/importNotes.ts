import {normalizePath, TFolder, type App} from 'obsidian';
import {buildNoteContentFromTemplate} from './buildNoteContent';
import {generateFilenameFromOutline} from './opmlOutlines';
import type {OpmlOutline} from './opmlTypes';

/** Normalized vault folder path; `''` is the vault root. */
export function normalizeFolderPath(input: string): string {
	const trimmed = input.trim();
	if (trimmed === '' || trimmed === '/') return '';
	const normalized = normalizePath(trimmed);
	return normalized === '/' ? '' : normalized;
}

export function joinVaultPath(folderPath: string, name: string): string {
	return folderPath === '' ? normalizePath(name) : normalizePath(`${folderPath}/${name}`);
}

export type FolderStatus = 'exists' | 'missing' | 'not-a-folder';

export function getFolderStatus(app: App, folderPath: string): FolderStatus {
	if (folderPath === '') return 'exists';
	const existing = app.vault.getAbstractFileByPath(folderPath);
	if (existing === null) return 'missing';
	return existing instanceof TFolder ? 'exists' : 'not-a-folder';
}

/**
 * Create `folderPath` and any missing parents.
 * @throws Error if a segment of the path exists as a file.
 */
export async function ensureFolder(app: App, folderPath: string): Promise<void> {
	if (folderPath === '') return;
	let current = '';
	for (const segment of folderPath.split('/')) {
		current = current === '' ? segment : `${current}/${segment}`;
		const status = getFolderStatus(app, current);
		if (status === 'not-a-folder') {
			throw new Error(`"${current}" is a file, not a folder.`);
		}
		if (status === 'missing') {
			await app.vault.createFolder(current);
		}
	}
}

/**
 * First free note path for `baseName` in `folderPath`: `Name.md`, then `Name 1.md`, `Name 2.md`, ...
 */
export async function findAvailableNotePath(
	folderPath: string,
	baseName: string,
	exists: (path: string) => Promise<boolean>,
): Promise<string> {
	let candidate = joinVaultPath(folderPath, `${baseName}.md`);
	for (let n = 1; await exists(candidate); n++) {
		candidate = joinVaultPath(folderPath, `${baseName} ${n}.md`);
	}
	return candidate;
}

export interface ImportFailure {
	name: string;
	error: unknown;
}

export interface ImportResult {
	created: string[];
	failed: ImportFailure[];
}

/**
 * Create one note per outline in `folderPath` (which must already exist).
 * A failure on one outline is recorded and does not stop the rest.
 */
export async function createNotesFromOutlines(
	app: App,
	outlines: OpmlOutline[],
	templateContent: string,
	folderPath: string,
): Promise<ImportResult> {
	const result: ImportResult = {created: [], failed: []};
	const exists = (path: string) => app.vault.adapter.exists(path);

	for (const outline of outlines) {
		const name = generateFilenameFromOutline(outline);
		try {
			const content = buildNoteContentFromTemplate(templateContent, outline);
			const path = await findAvailableNotePath(folderPath, name, exists);
			await app.vault.create(path, content);
			result.created.push(path);
		} catch (error) {
			console.error(`OPML import: failed to create note "${name}"`, error);
			result.failed.push({name, error});
		}
	}
	return result;
}
