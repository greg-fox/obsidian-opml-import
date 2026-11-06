import {normalizePath, TFolder, type App} from 'obsidian';
import {buildNoteContentFromTemplate} from './buildNoteContent';
import {generateFilenameFromOutline} from './opmlOutlines';
import {createPlaceholderContext, type PlaceholderContext} from './opmlPlaceholders';
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

/**
 * Rewrite each segment of `folderPath` to the casing of an existing vault item, so `Podcasts`
 * resolves to an existing `podcasts` folder. macOS and Windows treat the two as the same folder,
 * and creating the second one fails with "Folder already exists".
 */
export function matchExistingCase(app: App, folderPath: string): string {
	if (folderPath === '') return '';
	const existing = new Map(app.vault.getAllLoadedFiles().map((f) => [f.path.toLowerCase(), f.path]));
	let resolved = '';
	for (const segment of folderPath.split('/')) {
		const candidate = resolved === '' ? segment : `${resolved}/${segment}`;
		resolved = existing.get(candidate.toLowerCase()) ?? candidate;
	}
	return resolved;
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
export function findAvailableNotePath(
	folderPath: string,
	baseName: string,
	isTaken: (path: string) => boolean,
): string {
	let candidate = joinVaultPath(folderPath, `${baseName}.md`);
	for (let n = 1; isTaken(candidate); n++) {
		candidate = joinVaultPath(folderPath, `${baseName} ${n}.md`);
	}
	return candidate;
}

/**
 * Tracks which vault paths are in use. Matching ignores case, because macOS and Windows
 * file systems do, so `show.md` must not be created next to an existing `Show.md`.
 */
function createPathTracker(app: App): {isTaken: (path: string) => boolean; add: (path: string) => void} {
	const taken = new Set(app.vault.getAllLoadedFiles().map((f) => f.path.toLowerCase()));
	return {
		isTaken: (path) => taken.has(path.toLowerCase()),
		add: (path) => taken.add(path.toLowerCase()),
	};
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
	context: PlaceholderContext = createPlaceholderContext(),
): Promise<ImportResult> {
	const result: ImportResult = {created: [], failed: []};
	const paths = createPathTracker(app);

	for (const outline of outlines) {
		const name = generateFilenameFromOutline(outline);
		try {
			const content = buildNoteContentFromTemplate(templateContent, outline, context);
			const path = findAvailableNotePath(folderPath, name, paths.isTaken);
			await app.vault.create(path, content);
			paths.add(path);
			result.created.push(path);
		} catch (error) {
			console.error(`OPML import: failed to create note "${name}"`, error);
			result.failed.push({name, error});
		}
	}
	return result;
}
