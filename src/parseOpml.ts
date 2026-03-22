import * as opml from 'opml';

/** Parse OPML text using the npm `opml` package (async callback wrapped in a Promise). */
export function parseOpmlString(opmlContent: string): Promise<unknown> {
	return new Promise((resolve, reject) => {
		try {
			opml.parse(opmlContent, (err: Error | null, parsed: unknown) => {
				if (err) {
					reject(err instanceof Error ? err : new Error(String(err)));
					return;
				}
				resolve(parsed);
			});
		} catch (error) {
			reject(error instanceof Error ? error : new Error(String(error)));
		}
	});
}
