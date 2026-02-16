declare module 'opml' {
	export interface OpmlOutline {
		title?: string;
		text?: string;
		type?: string;
		xmlUrl?: string;
		htmlUrl?: string;
		created?: string;
		category?: string;
		outline?: OpmlOutline | OpmlOutline[];
	}

	export function parse(
		opmlText: string,
		callback: (err: Error | null, outline: OpmlOutline) => void
	): void;

	export function stringify(
		outline: OpmlOutline,
		callback: (err: Error | null, opmlText: string) => void
	): void;

	export function htmlify(outline: OpmlOutline): string;

	export function visitAll(
		outline: OpmlOutline,
		callback: (outline: OpmlOutline) => void
	): void;
}
