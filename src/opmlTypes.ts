/** Shape of a single outline node from the opml package / OPML attributes */
export interface OpmlOutline {
	title?: string;
	text?: string;
	type?: string;
	xmlUrl?: string;
	htmlUrl?: string;
	created?: string;
	category?: string;
	outline?: OpmlOutline[];
	/** opml package uses "subs" for child outlines */
	subs?: OpmlOutline[];
}
