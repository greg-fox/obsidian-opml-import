import {describe, expect, it} from 'vitest';
import {parseOpmlString} from './parseOpml';
import {getOutlinesFromParsed} from './opmlOutlines';

const minimalOpml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Test</title></head>
  <body>
    <outline text="Hello" xmlUrl="http://example.com/feed.xml"/>
  </body>
</opml>`;

describe('parseOpmlString', () => {
	it('parses valid OPML and yields outline rows via getOutlinesFromParsed', async () => {
		const parsed = await parseOpmlString(minimalOpml);
		expect(parsed).toBeTruthy();
		const rows = getOutlinesFromParsed(parsed);
		expect(rows.length).toBeGreaterThanOrEqual(1);
		expect(rows[0]?.text).toBe('Hello');
		expect(rows[0]?.xmlUrl).toContain('example.com');
	});

	it('rejects invalid XML', async () => {
		await expect(parseOpmlString('not xml')).rejects.toThrow();
	});
});
