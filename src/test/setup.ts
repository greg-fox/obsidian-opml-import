/**
 * Installs the subset of Obsidian's `HTMLElement` helpers (createEl, createDiv, empty, setText,
 * addClass, toggle) used by this plugin, so UI code can run against happy-dom in tests.
 */
interface DomElementInfo {
	cls?: string | string[];
	text?: string;
	attr?: Record<string, string>;
	value?: string;
	type?: string;
	placeholder?: string;
}

type Helpers = {
	createEl<K extends keyof HTMLElementTagNameMap>(tag: K, o?: DomElementInfo | string): HTMLElementTagNameMap[K];
	createDiv(o?: DomElementInfo | string): HTMLDivElement;
	empty(): void;
	setText(text: string): void;
	addClass(...classes: string[]): void;
	toggle(show: boolean): void;
};
type HelperElement = Element & Helpers;

// Obsidian's own typings declare these helpers globally; assign through an untyped view.
const proto = Element.prototype as unknown as Helpers;

proto.createEl = function <K extends keyof HTMLElementTagNameMap>(
	this: HelperElement,
	tag: K,
	o?: DomElementInfo | string,
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);
	const info: DomElementInfo = typeof o === 'string' ? {cls: o} : (o ?? {});
	if (info.cls) el.classList.add(...(Array.isArray(info.cls) ? info.cls : info.cls.split(' ')));
	if (info.text !== undefined) el.textContent = info.text;
	for (const [k, v] of Object.entries(info.attr ?? {})) el.setAttribute(k, v);
	if (info.type !== undefined) el.setAttribute('type', info.type);
	if (info.placeholder !== undefined) el.setAttribute('placeholder', info.placeholder);
	if (info.value !== undefined) (el as unknown as HTMLInputElement).value = info.value;
	this.appendChild(el);
	return el;
};

proto.createDiv = function (this: HelperElement, o?: DomElementInfo | string): HTMLDivElement {
	return this.createEl('div', o);
};

proto.empty = function (this: HelperElement): void {
	while (this.firstChild) this.removeChild(this.firstChild);
};

proto.setText = function (this: HelperElement, text: string): void {
	this.textContent = text;
};

proto.addClass = function (this: HelperElement, ...classes: string[]): void {
	this.classList.add(...classes);
};

proto.toggle = function (this: HelperElement, show: boolean): void {
	(this as HTMLElement).style.display = show ? '' : 'none';
};

export {};
