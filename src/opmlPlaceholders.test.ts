import {describe, expect, it} from 'vitest';
import {
	applyBodyPlaceholders,
	applyFrontmatterPlaceholders,
	applyOpmlPlaceholders,
	getPlaceholderValues,
} from './opmlPlaceholders';
import type {OpmlOutline} from './opmlTypes';

const full: OpmlOutline = {
	title: 'T',
	text: 'X',
	xmlUrl: 'http://a',
	htmlUrl: 'http://b',
	type: 'rss',
	created: '2020',
	category: 'c',
};

describe('getPlaceholderValues', () => {
	it('maps every field', () => {
		expect(getPlaceholderValues(full)).toEqual(full);
	});

	it('falls back between title and text, and uses empty strings for missing fields', () => {
		expect(getPlaceholderValues({text: 'only text'})).toMatchObject({title: 'only text', text: 'only text', xmlUrl: ''});
		expect(getPlaceholderValues({title: 'only title'})).toMatchObject({title: 'only title', text: 'only title'});
		expect(getPlaceholderValues({}).title).toBe('');
	});
});

describe('applyBodyPlaceholders', () => {
	it('replaces all placeholders as-is', () => {
		const t = '{{title}} {{text}} {{xmlUrl}} {{htmlUrl}} {{type}} {{created}} {{category}}';
		expect(applyBodyPlaceholders(t, full)).toBe('T X http://a http://b rss 2020 c');
	});

	it('keeps colons and newlines in the body', () => {
		expect(applyBodyPlaceholders('# {{title}}\n{{text}}', {title: 'a: b', text: 'line1\nline2'})).toBe(
			'# a: b\nline1\nline2',
		);
	});

	it('does not re-substitute placeholders that appear inside values', () => {
		expect(applyBodyPlaceholders('{{title}} {{xmlUrl}}', {title: '{{xmlUrl}}', xmlUrl: 'http://x'})).toBe(
			'{{xmlUrl}} http://x',
		);
	});

	it('leaves unknown placeholders alone', () => {
		expect(applyBodyPlaceholders('{{date}} {{title}}', {title: 'T'})).toBe('{{date}} T');
	});
});

describe('applyFrontmatterPlaceholders', () => {
	const apply = (fm: string, outline: OpmlOutline) => applyFrontmatterPlaceholders(fm, outline);

	it('quotes plain values so URLs keep their colons', () => {
		expect(apply('xmlUrl: {{xmlUrl}}', {xmlUrl: 'https://www.relay.fm/connected/feed'})).toBe(
			'xmlUrl: "https://www.relay.fm/connected/feed"',
		);
	});

	it('quotes values with YAML-significant characters', () => {
		expect(apply('title: {{title}}', {title: 'Ask: A Show #1'})).toBe('title: "Ask: A Show #1"');
		expect(apply('title: {{title}}', {title: '[draft] *bold* & "quoted"'})).toBe(
			'title: "[draft] *bold* & \\"quoted\\""',
		);
	});

	it('quotes the whole value when a placeholder is mixed with literal text', () => {
		expect(apply('title: Podcast - {{title}}', {title: 'A: B'})).toBe('title: "Podcast - A: B"');
	});

	it('collapses newlines in plain values', () => {
		expect(apply('text: {{text}}', {text: 'one\ntwo\r\nthree'})).toBe('text: "one two three"');
	});

	it('writes an empty quoted string for missing values', () => {
		expect(apply('htmlUrl: {{htmlUrl}}', {text: 'x'})).toBe('htmlUrl: ""');
	});

	it('keeps a trailing comment outside the quoted value', () => {
		expect(apply('title: {{title}} # the show', {title: 'T'})).toBe('title: "T" # the show');
	});

	it('escapes values inside an existing double-quoted scalar', () => {
		expect(apply('title: "Show: {{title}}"', {title: 'Say "hi"\nnow'})).toBe('title: "Show: Say \\"hi\\"\\nnow"');
	});

	it('escapes values inside an existing single-quoted scalar', () => {
		expect(apply("title: '{{title}}'", {title: "It's\nhere"})).toBe("title: 'It''s here'");
	});

	it('quotes each item in a flow sequence', () => {
		expect(apply('tags: [{{type}}, {{category}}]', {type: 'rss', category: 'a, b'})).toBe(
			'tags: ["rss", "a, b"]',
		);
	});

	it('quotes block sequence items', () => {
		expect(apply('aliases:\n  - {{text}}', {text: 'A: B'})).toBe('aliases:\n  - "A: B"');
	});

	it('inserts values as-is inside block scalars', () => {
		const fm = 'description: |\n  {{text}}\n  More: here\nurl: {{xmlUrl}}';
		expect(apply(fm, {text: 'Line: one\ntwo', xmlUrl: 'http://x'})).toBe(
			'description: |\n  Line: one two\n  More: here\nurl: "http://x"',
		);
	});

	it('keeps blank lines inside block scalars', () => {
		expect(apply('notes: >-\n  {{title}}\n\n  end', {title: 'T'})).toBe('notes: >-\n  T\n\n  end');
	});

	it('leaves lines without placeholders unchanged', () => {
		expect(apply('tags: podcast\ncreated: 2020-01-01', full)).toBe('tags: podcast\ncreated: 2020-01-01');
	});

	it('does not re-substitute placeholders that appear inside values', () => {
		expect(apply('a: {{title}} {{xmlUrl}}', {title: '{{xmlUrl}}', xmlUrl: 'u'})).toBe('a: "{{xmlUrl}} u"');
	});
});

describe('applyOpmlPlaceholders', () => {
	it('dispatches to frontmatter or body handling', () => {
		const outline = {title: 'a: b'};
		expect(applyOpmlPlaceholders('t: {{title}}', outline, true)).toBe('t: "a: b"');
		expect(applyOpmlPlaceholders('t: {{title}}', outline, false)).toBe('t: a: b');
	});
});
