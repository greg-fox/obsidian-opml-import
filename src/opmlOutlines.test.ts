import {describe, expect, it} from 'vitest';
import type {OpmlOutline} from './opmlTypes';
import {collectImportableOutlines, generateFilenameFromOutline} from './opmlOutlines';

const names = (outlines: OpmlOutline[]) => outlines.map((o) => o.text);

describe('collectImportableOutlines', () => {
	it('returns leaf outlines in document order', () => {
		expect(names(collectImportableOutlines([{text: 'A'}, {text: 'B'}]))).toEqual(['A', 'B']);
	});

	it('skips container outlines but keeps their children', () => {
		const outlines: OpmlOutline[] = [
			{text: 'feeds', children: [{text: 'A', xmlUrl: 'http://a'}, {text: 'B', xmlUrl: 'http://b'}]},
		];
		expect(names(collectImportableOutlines(outlines))).toEqual(['A', 'B']);
	});

	it('walks nested containers', () => {
		const outlines: OpmlOutline[] = [
			{text: 'Tech', children: [{text: 'Apple', children: [{text: 'Leaf'}]}, {text: 'Other'}]},
		];
		expect(names(collectImportableOutlines(outlines))).toEqual(['Leaf', 'Other']);
	});

	it('keeps an outline with an xmlUrl even when it has children', () => {
		const outlines: OpmlOutline[] = [{text: 'Feed', xmlUrl: 'http://f', children: [{text: 'Episode'}]}];
		expect(names(collectImportableOutlines(outlines))).toEqual(['Feed', 'Episode']);
	});

	it('keeps leaves identified only by title, xmlUrl, or htmlUrl', () => {
		const outlines: OpmlOutline[] = [{title: 'T'}, {xmlUrl: 'http://x'}, {htmlUrl: 'http://h'}];
		expect(collectImportableOutlines(outlines)).toHaveLength(3);
	});

	it('skips leaves with no content', () => {
		expect(collectImportableOutlines([{type: 'rss'}, {}])).toEqual([]);
	});

	it('returns an empty list for no outlines', () => {
		expect(collectImportableOutlines([])).toEqual([]);
	});
});

describe('generateFilenameFromOutline', () => {
	it('prefers title over text', () => {
		expect(generateFilenameFromOutline({title: 'Title', text: 'Text'})).toBe('Title');
		expect(generateFilenameFromOutline({text: 'Text'})).toBe('Text');
	});

	it('removes characters that are invalid in file names', () => {
		expect(generateFilenameFromOutline({title: 'a\\b/c:d*e?f"g<h>i|j'})).toBe('abcdefghij');
	});

	it('removes characters that break links, block refs, and headings', () => {
		expect(generateFilenameFromOutline({title: '[[Show]] #1 ^ref'})).toBe('Show 1 ref');
	});

	it('removes leading dots so the note is not hidden', () => {
		expect(generateFilenameFromOutline({title: '...dot show'})).toBe('dot show');
	});

	it('collapses whitespace and trims', () => {
		expect(generateFilenameFromOutline({title: '  A \n\t B  '})).toBe('A B');
	});

	it('truncates to 100 characters', () => {
		expect(generateFilenameFromOutline({title: 'x'.repeat(150)})).toHaveLength(100);
	});

	it('falls back to Untitled when nothing usable remains', () => {
		expect(generateFilenameFromOutline({})).toBe('Untitled');
		expect(generateFilenameFromOutline({title: '???'})).toBe('Untitled');
		expect(generateFilenameFromOutline({title: '...'})).toBe('Untitled');
	});
});
