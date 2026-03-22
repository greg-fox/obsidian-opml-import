import {describe, expect, it} from 'vitest';
import {splitFrontmatter} from './splitFrontmatter';

describe('splitFrontmatter', () => {
	it('returns full content as body when no frontmatter', () => {
		const s = '# Hello\n\nWorld';
		expect(splitFrontmatter(s)).toEqual({frontmatter: '', body: s});
	});

	it('splits standard YAML frontmatter', () => {
		const s = '---\ntitle: foo\ncreated: bar\n---\n\n# Body\n';
		expect(splitFrontmatter(s)).toEqual({
			frontmatter: 'title: foo\ncreated: bar',
			body: '\n# Body\n',
		});
	});

	it('treats first line with spaces before --- as no frontmatter', () => {
		const s = ' ---\nfoo: bar\n---\nbody';
		expect(splitFrontmatter(s)).toEqual({frontmatter: '', body: s});
	});
});
