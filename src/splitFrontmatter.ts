/**
 * Split markdown content into YAML frontmatter (between first pair of --- lines) and body.
 * If there is no valid opening/closing pair, the entire string is treated as body.
 */
export function splitFrontmatter(content: string): { frontmatter: string; body: string } {
	const lines = content.split(/\r?\n/);
	// Opening delimiter must be exactly `---` on line 1 (no leading spaces), matching common tools.
	const firstLine = lines[0] ?? '';
	if (lines.length === 0 || (firstLine !== '---' && firstLine !== '\uFEFF---')) {
		return { frontmatter: '', body: content };
	}
	let endIdx = -1;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i]?.trim() === '---') {
			endIdx = i;
			break;
		}
	}
	if (endIdx === -1) {
		return { frontmatter: '', body: content };
	}
	const frontmatter = lines.slice(1, endIdx).join('\n');
	const body = lines.slice(endIdx + 1).join('\n');
	return { frontmatter, body };
}
