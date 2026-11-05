import {normalizePath, TFolder, type App, type TFile} from 'obsidian';

export type TemplateSourceKind = 'core-templates' | 'templater';

export interface TemplateFolderSource {
	kind: TemplateSourceKind;
	label: string;
	folderPath: string;
}

export interface VaultTemplateOption {
	file: TFile;
	groupLabel: string;
}

const CORE_TEMPLATES_ID = 'templates';
const TEMPLATER_ID = 'templater-obsidian';

/**
 * Read a JSON file from the vault's config folder (`Vault.configDir`, usually `.obsidian`).
 * Config files are not indexed by the Vault API, so the adapter is the only public way to read them.
 * Returns `null` when the file is missing or not valid JSON.
 */
async function readConfigJson(app: App, relativePath: string): Promise<unknown> {
	try {
		return JSON.parse(await app.vault.adapter.read(normalizePath(`${app.vault.configDir}/${relativePath}`)));
	} catch {
		return null;
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function nonEmptyString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/**
 * `core-plugins.json` is a list of enabled plugin ids in older Obsidian versions
 * and an `{id: enabled}` map in newer ones.
 */
async function isCoreTemplatesEnabled(app: App): Promise<boolean> {
	const config = await readConfigJson(app, 'core-plugins.json');
	if (Array.isArray(config)) return config.includes(CORE_TEMPLATES_ID);
	return asRecord(config)[CORE_TEMPLATES_ID] === true;
}

/** `community-plugins.json` lists the ids of enabled community plugins. */
async function isCommunityPluginEnabled(app: App, id: string): Promise<boolean> {
	const config = await readConfigJson(app, 'community-plugins.json');
	return Array.isArray(config) && config.includes(id);
}

async function getCoreTemplatesFolder(app: App): Promise<string | null> {
	if (!(await isCoreTemplatesEnabled(app))) return null;
	return nonEmptyString(asRecord(await readConfigJson(app, 'templates.json')).folder);
}

async function getTemplaterFolder(app: App): Promise<string | null> {
	if (!(await isCommunityPluginEnabled(app, TEMPLATER_ID))) return null;
	const settings = asRecord(await readConfigJson(app, `plugins/${TEMPLATER_ID}/data.json`));
	return nonEmptyString(settings.templates_folder) ?? nonEmptyString(settings.folder);
}

/**
 * Template folders configured for the core Templates plugin and/or Templater,
 * read from their saved settings. Only enabled plugins are included; duplicate folders are dropped.
 */
export async function getTemplateFolderSources(app: App): Promise<TemplateFolderSource[]> {
	const candidates: Array<[TemplateSourceKind, string, string | null]> = [
		['core-templates', 'Core Templates', await getCoreTemplatesFolder(app)],
		['templater', 'Templater', await getTemplaterFolder(app)],
	];

	const sources: TemplateFolderSource[] = [];
	const seen = new Set<string>();
	for (const [kind, label, folder] of candidates) {
		if (folder === null) continue;
		const folderPath = normalizePath(folder);
		if (seen.has(folderPath)) continue;
		seen.add(folderPath);
		sources.push({kind, label, folderPath});
	}
	return sources;
}

/**
 * All markdown files under a vault folder (including nested folders).
 */
export function listMarkdownTemplatesInFolder(app: App, folderPath: string): TFile[] {
	const folder = app.vault.getAbstractFileByPath(folderPath);
	if (!(folder instanceof TFolder)) return [];

	const base = folder.path;
	const files = app.vault.getMarkdownFiles().filter((f) => {
		if (base === '' || base === '/') {
			return !f.path.includes('/');
		}
		return f.path.startsWith(base + '/');
	});
	return files.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Markdown templates from core Templates and/or Templater folders (deduped by path).
 */
export async function collectVaultTemplateFiles(app: App): Promise<VaultTemplateOption[]> {
	const result: VaultTemplateOption[] = [];
	const seenPaths = new Set<string>();

	for (const src of await getTemplateFolderSources(app)) {
		for (const f of listMarkdownTemplatesInFolder(app, src.folderPath)) {
			if (seenPaths.has(f.path)) continue;
			seenPaths.add(f.path);
			result.push({
				file: f,
				groupLabel: `${src.label} (${src.folderPath})`,
			});
		}
	}

	return result.sort((a, b) => a.file.path.localeCompare(b.file.path));
}
