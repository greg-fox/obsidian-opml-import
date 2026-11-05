import {describe, expect, it} from 'vitest';
import {buildNoteContentFromTemplate} from './buildNoteContent';

describe('buildNoteContentFromTemplate', () => {
	it('renders body only when there is no frontmatter', () => {
		expect(buildNoteContentFromTemplate('# {{title}}\n', {title: 'Hi', text: ''})).toBe('# Hi\n');
	});

	it('quotes frontmatter values and leaves body values as-is', () => {
		const tpl = '---\ntitle: {{title}}\nxmlUrl: {{xmlUrl}}\n---\n\n# {{title}}\n{{xmlUrl}}';
		const out = buildNoteContentFromTemplate(tpl, {title: 'Ask: A Show', xmlUrl: 'https://example.com/ask.xml'});
		expect(out).toBe(
			'---\ntitle: "Ask: A Show"\nxmlUrl: "https://example.com/ask.xml"\n---\n\n# Ask: A Show\nhttps://example.com/ask.xml',
		);
	});

	it('keeps the spacing between frontmatter and body from the template', () => {
		expect(buildNoteContentFromTemplate('---\na: {{title}}\n---\nBody', {title: 'T'})).toBe('---\na: "T"\n---\nBody');
	});

	it('drops an empty frontmatter block', () => {
		expect(buildNoteContentFromTemplate('---\n---\nBody {{text}}', {text: 'X'})).toBe('Body X');
	});

	it('treats an unterminated frontmatter block as body text', () => {
		expect(buildNoteContentFromTemplate('---\ntitle: {{title}}', {title: 'a: b'})).toBe('---\ntitle: a: b');
	});
});
