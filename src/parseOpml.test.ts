import {describe, expect, it} from 'vitest';
import {OpmlParseError, parseOpml} from './parseOpml';
import {PODCAST_OPML} from './test/fakeVault';

describe('parseOpml', () => {
	it('reads known attributes from top-level outlines', () => {
		const outlines = parseOpml(`<?xml version="1.0"?>
<opml version="2.0"><head><title>T</title></head><body>
  <outline text="Hello" title="Hello title" type="rss" xmlUrl="http://example.com/feed.xml"
    htmlUrl="http://example.com" created="Mon, 16 Feb 2026 10:00:00 GMT" category="/tech"/>
</body></opml>`);
		expect(outlines).toEqual([
			{
				text: 'Hello',
				title: 'Hello title',
				type: 'rss',
				xmlUrl: 'http://example.com/feed.xml',
				htmlUrl: 'http://example.com',
				created: 'Mon, 16 Feb 2026 10:00:00 GMT',
				category: '/tech',
			},
		]);
	});

	it('preserves nesting as children', () => {
		const outlines = parseOpml(PODCAST_OPML);
		expect(outlines).toHaveLength(1);
		expect(outlines[0]?.text).toBe('feeds');
		expect(outlines[0]?.children?.map((o) => o.text)).toEqual(['Connected', 'Mac Power Users', 'Ask: A Show']);
	});

	it('matches attribute names case-insensitively', () => {
		const outlines = parseOpml('<opml><body><outline TEXT="a" xmlurl="http://x"/></body></opml>');
		expect(outlines).toEqual([{text: 'a', xmlUrl: 'http://x'}]);
	});

	it('ignores unknown attributes and decodes entities', () => {
		const outlines = parseOpml('<opml><body><outline text="A &amp; B" applePodcastsID="1"/></body></opml>');
		expect(outlines).toEqual([{text: 'A & B'}]);
	});

	it('omits children when an outline has none', () => {
		const [outline] = parseOpml('<opml><body><outline text="leaf"></outline></body></opml>');
		expect(outline).not.toHaveProperty('children');
	});

	it('returns an empty list for an empty body', () => {
		expect(parseOpml('<opml><body/></opml>')).toEqual([]);
	});

	it('rejects text that is not XML', () => {
		expect(() => parseOpml('not xml')).toThrow(OpmlParseError);
		expect(() => parseOpml('not xml')).toThrow('not valid XML');
	});

	it('rejects malformed XML', () => {
		expect(() => parseOpml('<opml><body><outline text="a"></body></opml>')).toThrow('not valid XML');
	});

	it('rejects XML that is not OPML', () => {
		expect(() => parseOpml('<rss><channel/></rss>')).toThrow('not an OPML document');
	});

	it('rejects OPML without a body', () => {
		expect(() => parseOpml('<opml><head/></opml>')).toThrow('no body element');
	});
});
