import {moment} from 'obsidian';
import type {OpmlOutline} from './opmlTypes';

export const PLACEHOLDER_KEYS = ['title', 'text', 'xmlUrl', 'htmlUrl', 'type', 'created', 'category'] as const;
export type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number];

/** Defaults used by the core Templates plugin when no format is configured. */
export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_TIME_FORMAT = 'HH:mm';

/** Values that are the same for every note in one import. */
export interface PlaceholderContext {
	/** Moment used for `{{date}}` and `{{time}}`, captured once per import. */
	now: ReturnType<typeof moment>;
	dateFormat: string;
	timeFormat: string;
}

export function createPlaceholderContext(options: Partial<PlaceholderContext> = {}): PlaceholderContext {
	return {
		now: options.now ?? moment(),
		dateFormat: options.dateFormat || DEFAULT_DATE_FORMAT,
		timeFormat: options.timeFormat || DEFAULT_TIME_FORMAT,
	};
}

/**
 * Matches outline placeholders (`{{title}}`) and the core Templates date placeholders
 * (`{{date}}`, `{{time}}`, `{{date:YYYY-MM-DD}}`, `{{time:HH:mm}}`).
 * Spaces inside the braces are allowed: `{{ xmlUrl }}`, `{{ date : YYYY }}`.
 */
const PLACEHOLDER_PATTERN = new RegExp(
	`\\{\\{\\s*(?:(${PLACEHOLDER_KEYS.join('|')})|(date|time)(?:\\s*:([^{}]*))?)\\s*\\}\\}`,
	'g',
);

/** Placeholder values for an outline. `title` and `text` fall back to each other. */
export function getPlaceholderValues(outline: OpmlOutline): Record<PlaceholderKey, string> {
	return {
		title: outline.title ?? outline.text ?? '',
		text: outline.text ?? outline.title ?? '',
		xmlUrl: outline.xmlUrl ?? '',
		htmlUrl: outline.htmlUrl ?? '',
		type: outline.type ?? '',
		created: outline.created ?? '',
		category: outline.category ?? '',
	};
}

type Resolve = (key: PlaceholderKey | undefined, dateKind: 'date' | 'time' | undefined, format: string | undefined) => string;

function createResolver(outline: OpmlOutline, context: PlaceholderContext): Resolve {
	const values = getPlaceholderValues(outline);
	return (key, dateKind, format) => {
		if (key) return values[key];
		const fallback = dateKind === 'time' ? context.timeFormat : context.dateFormat;
		return context.now.format(format?.trim() || fallback);
	};
}

/**
 * Replace placeholders in a single pass, so substituted values are never re-scanned
 * (an outline titled `{{xmlUrl}}` stays literal).
 */
function replacePlaceholders(template: string, resolve: Resolve, encode: (value: string) => string): string {
	return template.replace(
		PLACEHOLDER_PATTERN,
		(_match, key: PlaceholderKey | undefined, dateKind: 'date' | 'time' | undefined, format: string | undefined) =>
			encode(resolve(key, dateKind, format)),
	);
}

function hasPlaceholder(text: string): boolean {
	PLACEHOLDER_PATTERN.lastIndex = 0;
	return PLACEHOLDER_PATTERN.test(text);
}

/** Markdown body: values are inserted as-is. */
export function applyBodyPlaceholders(
	template: string,
	outline: OpmlOutline,
	context: PlaceholderContext = createPlaceholderContext(),
): string {
	return replacePlaceholders(template, createResolver(outline, context), (v) => v);
}

const LINE_PATTERN = /^(\s*(?:-\s+)?(?:[^\s#'"{}[\]:-][^:]*?:(?:\s+|$))?)(.*)$/;
const BLOCK_SCALAR_HEADER = /^[|>][-+0-9]*\s*(?:#.*)?$/;

const collapseNewlines = (v: string): string => v.replace(/\r?\n/g, ' ');
/** Contents of a double-quoted YAML scalar (JSON escaping is valid YAML). */
const escapeDoubleQuoted = (v: string): string => JSON.stringify(v).slice(1, -1);
const escapeSingleQuoted = (v: string): string => collapseNewlines(v).replace(/'/g, "''");

/**
 * YAML frontmatter: each value is encoded for the scalar it lands in, so URLs, colons,
 * quotes, `#`, and leading YAML indicators survive intact.
 *
 * - `key: {{x}}` (plain) becomes a double-quoted scalar of the whole rendered value.
 * - `key: "...{{x}}..."` and `key: '...{{x}}...'` are escaped for that quote style.
 * - `key: [{{x}}, {{y}}]` quotes each item.
 * - Lines inside a `|` or `>` block scalar are inserted as-is, with newlines collapsed.
 */
export function applyFrontmatterPlaceholders(
	frontmatter: string,
	outline: OpmlOutline,
	context: PlaceholderContext = createPlaceholderContext(),
): string {
	const resolve = createResolver(outline, context);
	let blockParentIndent: number | null = null;

	return frontmatter
		.split('\n')
		.map((line) => {
			const indent = line.length - line.trimStart().length;
			if (blockParentIndent !== null) {
				if (line.trim() === '' || indent > blockParentIndent) {
					return replacePlaceholders(line, resolve, collapseNewlines);
				}
				blockParentIndent = null;
			}

			const match = LINE_PATTERN.exec(line);
			const prefix = match?.[1] ?? '';
			const value = match?.[2] ?? line;

			if (BLOCK_SCALAR_HEADER.test(value.trim())) {
				blockParentIndent = indent;
				return line;
			}
			if (!hasPlaceholder(value)) return line;

			return prefix + renderYamlValue(value.trimEnd(), resolve);
		})
		.join('\n');
}

function renderYamlValue(value: string, resolve: Resolve): string {
	if (value.startsWith('"')) return replacePlaceholders(value, resolve, escapeDoubleQuoted);
	if (value.startsWith("'")) return replacePlaceholders(value, resolve, escapeSingleQuoted);
	if (value.startsWith('[')) return replacePlaceholders(value, resolve, (v) => JSON.stringify(v));

	// Plain scalar: keep a trailing ` # comment`, quote everything before it.
	const commentAt = value.search(/\s#/);
	const content = commentAt === -1 ? value : value.slice(0, commentAt);
	const comment = commentAt === -1 ? '' : value.slice(commentAt);
	if (!hasPlaceholder(content)) return value;
	const rendered = replacePlaceholders(content, resolve, collapseNewlines).trim();
	return JSON.stringify(rendered) + comment;
}

/**
 * Replace `{{title}}`, `{{text}}`, `{{date}}`, etc. with values from an OPML outline.
 * When `forYaml` is true the template is treated as frontmatter and values are YAML-encoded.
 */
export function applyOpmlPlaceholders(
	template: string,
	outline: OpmlOutline,
	forYaml: boolean,
	context: PlaceholderContext = createPlaceholderContext(),
): string {
	return forYaml
		? applyFrontmatterPlaceholders(template, outline, context)
		: applyBodyPlaceholders(template, outline, context);
}
