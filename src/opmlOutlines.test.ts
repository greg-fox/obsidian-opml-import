import {describe, expect, it} from 'vitest';
import type {OpmlOutline} from './opmlTypes';
import {flattenOutlines, generateFilenameFromOutline, getOutlinesFromParsed} from './opmlOutlines';

describe('getOutlinesFromParsed', () => {
	it('returns empty array when no opml.body', () => {
		expect(getOutlinesFromParsed({})).toEqual([]);
		expect(getOutlinesFromParsed({opml: {}})).toEqual([]);
	});

	it('collects subs from opml package shape', () => {
		const parsed = {
			opml: {
				body: {
					subs: [{text: 'A', xmlUrl: 'http://a'}, {text: 'B'}],
				},
			},
		};
		const rows = getOutlinesFromParsed(parsed);
		expect(rows).toHaveLength(2);
		expect(rows[0]?.text).toBe('A');
		expect(rows[1]?.text).toBe('B');
	});

	it('handles body with text but no subs', () => {
		const parsed = {
			opml: {
				body: {text: 'Only', title: 'T'},
			},
		};
		expect(getOutlinesFromParsed(parsed)).toEqual([{text: 'Only', title: 'T'}]);
	});

	it('ignores empty body object', () => {
		expect(getOutlinesFromParsed({opml: {body: {}}})).toEqual([]);
	});
});

describe('flattenOutlines', () => {
	it('includes node and nested subs', () => {
		const root: OpmlOutline = {
			text: 'root',
			subs: [{text: 'child'}],
		};
		const flat = flattenOutlines(root);
		expect(flat.map((o) => o.text)).toEqual(['root', 'child']);
	});

	it('uses outline when subs missing', () => {
		const root: OpmlOutline = {
			text: 'root',
			outline: [{text: 'legacy'}],
		};
		expect(flattenOutlines(root).map((o) => o.text)).toEqual(['root', 'legacy']);
	});

	it('skips nodes with no text, title, or xmlUrl', () => {
		const root: OpmlOutline = {
			subs: [{text: 'leaf'}],
		};
		expect(flattenOutlines(root).map((o) => o.text)).toEqual(['leaf']);
	});
});

describe('generateFilenameFromOutline', () => {
	it('uses title and sanitizes', () => {
		expect(generateFilenameFromOutline({title: 'Hello: World'})).toBe('Hello World');
	});

	it('falls back to text then Untitled', () => {
		expect(generateFilenameFromOutline({text: 'x'})).toBe('x');
		expect(generateFilenameFromOutline({})).toBe('Untitled');
	});
});
