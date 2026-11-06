import {vi} from 'vitest';
import {TFile, TFolder, type App, type TAbstractFile} from './obsidian-stub';

export interface FakeVaultOptions {
	/** Files to seed, keyed by vault path. Parent folders are created automatically. */
	files?: Record<string, string>;
	/** Extra empty folders to seed. */
	folders?: string[];
	/** Core Templates folder; `null` disables the core plugin. Defaults to `Templates`. */
	templatesFolder?: string | null;
	/** Extra JSON files in the config folder, keyed by path relative to it (overrides the defaults). */
	config?: Record<string, unknown>;
}

/** Deliberately not `.obsidian`: users can rename the config folder, and the code must follow `Vault#configDir`. */
export const CONFIG_DIR = '.custom-config';

export interface FakeVault {
	app: App;
	/** Current file contents, keyed by path. */
	files: Map<string, string>;
	folders: Set<string>;
	create: ReturnType<typeof vi.fn<(path: string, data: string) => Promise<TFile>>>;
	createFolder: ReturnType<typeof vi.fn<(path: string) => Promise<TFolder>>>;
}

const CORE_TEMPLATES = 'templates';

function makeFile(path: string): TFile {
	const file = new TFile();
	const name = path.split('/').pop() ?? path;
	const dot = name.lastIndexOf('.');
	file.path = path;
	file.name = name;
	file.basename = dot > 0 ? name.slice(0, dot) : name;
	file.extension = dot > 0 ? name.slice(dot + 1) : '';
	return file;
}

function makeFolder(path: string): TFolder {
	const folder = new TFolder();
	folder.path = path;
	folder.name = path.split('/').pop() ?? path;
	return folder;
}

function parentFolders(path: string): string[] {
	const parts = path.split('/').slice(0, -1);
	return parts.map((_, i) => parts.slice(0, i + 1).join('/'));
}

/** In-memory vault with the subset of the `App` API this plugin uses. */
export function createFakeVault(options: FakeVaultOptions = {}): FakeVault {
	const files = new Map<string, string>(Object.entries(options.files ?? {}));
	const folders = new Set<string>(options.folders ?? []);
	for (const path of [...files.keys(), ...folders]) {
		for (const parent of parentFolders(path)) folders.add(parent);
	}

	const lookup = (path: string): TAbstractFile | null => {
		if (files.has(path)) return makeFile(path);
		if (folders.has(path)) return makeFolder(path);
		return null;
	};
	const allFiles = () => [...files.keys()].sort().map(makeFile);

	const create = vi.fn(async (path: string, data: string) => {
		// Like macOS and Windows, treat paths that differ only by case as the same file.
		const clash = [...files.keys(), ...folders].some((p) => p.toLowerCase() === path.toLowerCase());
		if (clash) throw new Error(`File already exists: ${path}`);
		files.set(path, data);
		return makeFile(path);
	});
	const createFolder = vi.fn(async (path: string) => {
		const clash = [...files.keys(), ...folders].some((p) => p.toLowerCase() === path.toLowerCase());
		if (clash) throw new Error(`Folder already exists: ${path}`);
		folders.add(path);
		return makeFolder(path);
	});

	const templatesFolder = options.templatesFolder === undefined ? 'Templates' : options.templatesFolder;
	const config = new Map<string, string>(
		Object.entries({
			'core-plugins.json': {[CORE_TEMPLATES]: templatesFolder !== null},
			'templates.json': {folder: templatesFolder ?? ''},
			...options.config,
		}).map(([path, value]) => [`${CONFIG_DIR}/${path}`, JSON.stringify(value)]),
	);

	const app: App = {
		vault: {
			configDir: CONFIG_DIR,
			getAbstractFileByPath: lookup,
			getAllLoadedFiles: () => [...[...folders].sort().map(makeFolder), ...allFiles()],
			getFiles: allFiles,
			getMarkdownFiles: () => allFiles().filter((f) => f.extension === 'md'),
			read: async (file: TFile) => {
				const content = files.get(file.path);
				if (content === undefined) throw new Error(`No such file: ${file.path}`);
				return content;
			},
			create,
			createFolder,
			adapter: {
				read: async (path: string) => {
					const content = config.get(path);
					if (content === undefined) throw new Error(`ENOENT: ${path}`);
					return content;
				},
			},
		},
	};

	return {app, files, folders, create, createFolder};
}

/** OPML shaped like an Overcast export: feeds nested under a container outline. */
export const PODCAST_OPML = `<?xml version="1.0" encoding="utf-8"?>
<opml version="1.0">
  <head><title>Podcast Subscriptions</title></head>
  <body>
    <outline text="feeds">
      <outline type="rss" text="Connected" xmlUrl="https://www.relay.fm/connected/feed" htmlUrl="https://www.relay.fm/connected"/>
      <outline type="rss" text="Mac Power Users" xmlUrl="https://www.relay.fm/mpu/feed"/>
      <outline type="rss" text="Ask: A Show" xmlUrl="https://example.com/ask.xml"/>
    </outline>
  </body>
</opml>`;
