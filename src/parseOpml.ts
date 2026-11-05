import type {OpmlOutline} from './opmlTypes';

/** Outline attributes copied onto {@link OpmlOutline}. Matching is case-insensitive. */
const KNOWN_ATTRIBUTES = ['title', 'text', 'type', 'xmlUrl', 'htmlUrl', 'created', 'category'] as const;

const ATTRIBUTE_BY_LOWERCASE = new Map<string, (typeof KNOWN_ATTRIBUTES)[number]>(
	KNOWN_ATTRIBUTES.map((name) => [name.toLowerCase(), name]),
);

export class OpmlParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OpmlParseError';
	}
}

/**
 * Parse OPML text into the top-level outlines of its `<body>`.
 * Uses the platform `DOMParser`, so it works on desktop and mobile without dependencies.
 * @throws OpmlParseError when the text is not well-formed XML or not an OPML document.
 */
export function parseOpml(xml: string): OpmlOutline[] {
	const doc = new DOMParser().parseFromString(xml, 'application/xml');
	if (doc.getElementsByTagName('parsererror').length > 0) {
		throw new OpmlParseError('The file is not valid XML.');
	}

	const root = doc.documentElement;
	if (root.localName.toLowerCase() !== 'opml') {
		throw new OpmlParseError('The file is not an OPML document.');
	}

	const body = childElements(root, 'body')[0];
	if (!body) {
		throw new OpmlParseError('The OPML document has no body element.');
	}

	return readOutlines(body);
}

function childElements(parent: Element, localName: string): Element[] {
	return Array.from(parent.children).filter((el) => el.localName.toLowerCase() === localName);
}

function readOutlines(parent: Element): OpmlOutline[] {
	return childElements(parent, 'outline').map(readOutline);
}

function readOutline(el: Element): OpmlOutline {
	const outline: OpmlOutline = {};
	for (const attr of Array.from(el.attributes)) {
		const key = ATTRIBUTE_BY_LOWERCASE.get(attr.name.toLowerCase());
		if (key) outline[key] = attr.value;
	}
	const children = readOutlines(el);
	if (children.length > 0) outline.children = children;
	return outline;
}
