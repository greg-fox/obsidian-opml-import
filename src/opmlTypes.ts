/** A single `<outline>` element from an OPML document. */
export interface OpmlOutline {
	title?: string;
	text?: string;
	type?: string;
	xmlUrl?: string;
	htmlUrl?: string;
	created?: string;
	category?: string;
	/** Nested `<outline>` elements, in document order. */
	children?: OpmlOutline[];
}
