import { TFolder, type App, type TFile } from 'obsidian';

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

interface LooseInternalPlugin {
	enabled?: boolean;
	instance?: {
		options?: Record<string, unknown>;
	};
}

function getInternalPlugin(app: App, id: string): LooseInternalPlugin | null {
	const plugins = (app as unknown as { internalPlugins?: { plugins?: unknown } }).internalPlugins?.plugins;
	if (!plugins) return null;
	if (plugins instanceof Map) {
		return (plugins.get(id) as LooseInternalPlugin) ?? null;
	}
	const record = plugins as Record<string, LooseInternalPlugin>;
	return record[id] ?? null;
}

/**
 * Discover template folders from the core Templates plugin and/or Templater.
 */
export function getTemplateFolderSources(app: App): TemplateFolderSource[] {
	const sources: TemplateFolderSource[] = [];

	const core = getInternalPlugin(app, 'templates');
	if (core?.enabled) {
		const folder = core.instance?.options?.folder;
		if (typeof folder === 'string' && folder.length > 0) {
			sources.push({
				kind: 'core-templates',
				label: 'Core Templates',
				folderPath: folder,
			});
		}
	}

	// Community plugin API is not typed in obsidian.d.ts
	const templater = (app as unknown as { plugins?: { plugins?: Record<string, unknown> } }).plugins?.plugins?.[
		'templater-obsidian'
	] as { settings?: Record<string, unknown> } | undefined;
	if (templater?.settings) {
		const s = templater.settings;
		const folder =
			(typeof s.templates_folder === 'string' && s.templates_folder) ||
			(typeof s.folder === 'string' && s.folder) ||
			undefined;
		if (folder && folder.length > 0) {
			sources.push({
				kind: 'templater',
				label: 'Templater',
				folderPath: folder,
			});
		}
	}

	const seen = new Set<string>();
	return sources.filter((src) => {
		if (seen.has(src.folderPath)) return false;
		seen.add(src.folderPath);
		return true;
	});
}

/**
 * All markdown files under a vault folder (including nested folders).
 */
export function listMarkdownTemplatesInFolder(app: App, folderPath: string): TFile[] {
	const folder = app.vault.getAbstractFileByPath(folderPath);
	if (!folder || !(folder instanceof TFolder)) return [];

	const base = folder.path;
	const files = app.vault.getMarkdownFiles().filter((f) => {
		if (base === '' || base === '/') {
			return !f.path.includes('/');
		}
		return f.path === base || f.path.startsWith(base + '/');
	});
	return files.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Markdown templates from core Templates and/or Templater folders (deduped by path).
 */
export function collectVaultTemplateFiles(app: App): VaultTemplateOption[] {
	const result: VaultTemplateOption[] = [];
	const seenPaths = new Set<string>();

	for (const src of getTemplateFolderSources(app)) {
		const files = listMarkdownTemplatesInFolder(app, src.folderPath);
		for (const f of files) {
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
