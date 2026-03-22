import { applyOpmlPlaceholders } from './opmlPlaceholders';
import { splitFrontmatter } from './splitFrontmatter';
import type { OpmlOutline } from './opmlTypes';

/**
 * Render vault template + outline into final Markdown (frontmatter + body).
 * Used by import; pure function for testing.
 */
export function buildNoteContentFromTemplate(templateContent: string, outline: OpmlOutline): string {
	const {frontmatter: fmRaw, body: bodyRaw} = splitFrontmatter(templateContent);
	const frontmatter = applyOpmlPlaceholders(fmRaw, outline, true);
	const body = applyOpmlPlaceholders(bodyRaw, outline, false);

	if (frontmatter.trim()) {
		let fm = frontmatter.trim();
		if (!fm.startsWith('---')) {
			fm = '---\n' + fm;
		}
		if (!fm.endsWith('---')) {
			fm = fm + '\n---';
		}
		return fm + '\n\n' + body;
	}
	return body;
}
