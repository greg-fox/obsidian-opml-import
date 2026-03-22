import {describe, expect, it} from 'vitest';
import {applyOpmlPlaceholders} from './opmlPlaceholders';
import type {OpmlOutline} from './opmlTypes';

describe('applyOpmlPlaceholders', () => {
	it('replaces all known placeholders in body mode', () => {
		const outline: OpmlOutline = {
			title: 'T',
			text: 'X',
			xmlUrl: 'http://a',
			htmlUrl: 'http://b',
			type: 'rss',
			created: '2020',
			category: 'c',
		};
		const t =
			'{{title}} {{text}} {{xmlUrl}} {{htmlUrl}} {{type}} {{created}} {{category}}';
		expect(applyOpmlPlaceholders(t, outline, false)).toBe(
			'T X http://a http://b rss 2020 c',
		);
	});

	it('sanitizes colons in YAML mode', () => {
		const outline: OpmlOutline = {title: 'a:b', text: 'c'};
		expect(applyOpmlPlaceholders('t={{title}}', outline, true)).toBe('t=ab');
	});
});
