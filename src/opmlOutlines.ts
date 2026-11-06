import type {OpmlOutline} from './opmlTypes';

/**
 * Flatten an outline tree into the rows that should become notes, in document order.
 *
 * - An outline with an `xmlUrl` is always a row (it is a feed), even if it has children.
 * - An outline with children and no `xmlUrl` is a container (for example a category folder)
 *   and is skipped; its children are still visited.
 * - A leaf outline is a row when it has a `title`, `text`, or `htmlUrl`.
 */
export function collectImportableOutlines(outlines: OpmlOutline[]): OpmlOutline[] {
	const result: OpmlOutline[] = [];
	for (const outline of outlines) {
		const children = outline.children ?? [];
		const isContainer = children.length > 0 && !outline.xmlUrl;
		if (!isContainer && hasContent(outline)) {
			result.push(outline);
		}
		result.push(...collectImportableOutlines(children));
	}
	return result;
}

function hasContent(outline: OpmlOutline): boolean {
	return Boolean(outline.title || outline.text || outline.xmlUrl || outline.htmlUrl);
}

/** Characters that are invalid in file names or that break wikilinks, block refs, or headings. */
const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|#^[\]]/g;
const MAX_FILENAME_LENGTH = 100;
/**
 * Device names Windows reserves. They are reserved with any extension too (`NUL.tar.gz` is `NUL`),
 * so the match is the name followed by a dot or the end of the string.
 */
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(?=\.|$)/i;

/** Note name (without extension) derived from an outline's title, then text. */
export function generateFilenameFromOutline(outline: OpmlOutline): string {
	const name = (outline.title || outline.text || '')
		.replace(UNSAFE_FILENAME_CHARS, '')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^\.+/, '')
		.substring(0, MAX_FILENAME_LENGTH)
		.trim();
	if (name === '') return 'Untitled';
	// Windows cannot create files named after devices, so a vault synced there would break.
	return name.replace(WINDOWS_RESERVED_NAME, '$1_');
}
