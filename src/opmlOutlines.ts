import type { OpmlOutline } from './opmlTypes';

/** Flatten parsed OPML package output into a list of outline rows with content. */
export function getOutlinesFromParsed(parsed: unknown): OpmlOutline[] {
	const result: OpmlOutline[] = [];
	const opmlBody = (parsed as { opml?: { body?: unknown } })?.opml?.body;
	if (!opmlBody) return result;

	const body = opmlBody as { subs?: OpmlOutline[]; text?: string; title?: string; xmlUrl?: string };
	const topLevel = body.subs;
	if (Array.isArray(topLevel)) {
		for (const item of topLevel) {
			result.push(...flattenOutlines(item));
		}
	} else {
		if (body.text || body.title || body.xmlUrl) {
			result.push(body as OpmlOutline);
		}
	}
	return result;
}

export function flattenOutlines(outline: OpmlOutline): OpmlOutline[] {
	const result: OpmlOutline[] = [];
	if (outline.text || outline.title || outline.xmlUrl) {
		result.push(outline);
	}
	const children = outline.subs ?? outline.outline;
	if (children && Array.isArray(children)) {
		for (const child of children) {
			result.push(...flattenOutlines(child));
		}
	}
	return result;
}

/** Safe note title from outline fields (matches import behavior). */
export function generateFilenameFromOutline(outline: OpmlOutline): string {
	const name = outline.title || outline.text || 'Untitled';
	return (
		name
			.replace(/[<>:"/\\|?*]/g, '')
			.replace(/\s+/g, ' ')
			.substring(0, 100)
			.trim() || 'Untitled'
	);
}
