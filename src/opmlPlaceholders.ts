import type { OpmlOutline } from './opmlTypes';

/**
 * Replace {{title}}, {{text}}, etc. with values from an OPML outline.
 * When forYaml is true, values are sanitized for unquoted YAML scalars.
 */
export function applyOpmlPlaceholders(template: string, outline: OpmlOutline, forYaml: boolean): string {
	let result = template;

	const sanitizeForYaml = (value: string | undefined): string => {
		if (!value) return '';
		return value
			.replace(/[:]/g, '')
			.replace(/\r?\n/g, ' ')
			.trim();
	};

	const pick = (value: string | undefined, fallback?: string): string => {
		const v = value ?? fallback ?? '';
		return forYaml ? sanitizeForYaml(v) : v;
	};

	const title = pick(outline.title, outline.text);
	const text = pick(outline.text, outline.title);
	const xmlUrl = pick(outline.xmlUrl);
	const htmlUrl = pick(outline.htmlUrl);
	const type = pick(outline.type);
	const created = pick(outline.created);
	const category = pick(outline.category);

	result = result.replace(/\{\{title\}\}/g, title);
	result = result.replace(/\{\{text\}\}/g, text);
	result = result.replace(/\{\{xmlUrl\}\}/g, xmlUrl);
	result = result.replace(/\{\{htmlUrl\}\}/g, htmlUrl);
	result = result.replace(/\{\{type\}\}/g, type);
	result = result.replace(/\{\{created\}\}/g, created);
	result = result.replace(/\{\{category\}\}/g, category);

	return result;
}
