import {describe, expect, it} from 'vitest';
import {buildNoteContentFromTemplate} from './buildNoteContent';

describe('buildNoteContentFromTemplate', () => {
	it('renders body only when no frontmatter', () => {
		const out = buildNoteContentFromTemplate('# {{title}}\n', {title: 'Hi', text: ''});
		expect(out).toBe('# Hi\n');
	});

	it('combines frontmatter and body', () => {
		const tpl = '---\ntitle: {{title}}\n---\n\nBody {{text}}';
		const out = buildNoteContentFromTemplate(tpl, {title: 'T', text: 'X'});
		expect(out).toContain('title: T');
		expect(out).toContain('Body X');
	});
});
