// jsdom lacks browser APIs that the UI helpers touch when they load or mount
class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() {
		return [];
	}
}

globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver;

window.matchMedia ??= ((query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addEventListener() {},
	removeEventListener() {},
	addListener() {},
	removeListener() {},
	dispatchEvent: () => false
})) as typeof window.matchMedia;

// jsdom has no popovers: it hides every [popover] and has no showPopover. The stand-in shows one when asked, as a
// browser does, so a test can find what floats in one (the menu list). jsdom weighs its own rule above a page's, so
// the stand-in's needs !important.
if (!('showPopover' in HTMLElement.prototype)) {
	Object.defineProperties(HTMLElement.prototype, {
		showPopover: {
			configurable: true,
			value(this: HTMLElement) {
				this.toggleAttribute('data-popover-open', true);
			}
		},
		hidePopover: {
			configurable: true,
			value(this: HTMLElement) {
				this.removeAttribute('data-popover-open');
			}
		}
	});
}
document.head.insertAdjacentHTML(
	'beforeend',
	'<style>[popover][data-popover-open] { display: block !important; }</style>'
);

// Svelte's transitions run on the Web Animations API, which jsdom lacks: every animation finishes at once.
if (!('animate' in Element.prototype)) {
	Object.defineProperty(Element.prototype, 'animate', {
		configurable: true,
		value: () => {
			const animation = {
				onfinish: null as null | (() => void),
				finished: Promise.resolve(),
				currentTime: 0,
				effect: null,
				cancel: () => {},
				play: () => {},
				pause: () => {}
			};
			queueMicrotask(() => animation.onfinish?.());
			return animation as unknown as Animation;
		}
	});
}
