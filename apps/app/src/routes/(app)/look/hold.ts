// No text is selected while something is dragged (Justin, 2026-11-17: dragging the lower half "will automatically
// select all the text in there"). Every drag in the app takes the pointer (setPointerCapture): the sheet, the
// desktop's line, the sidebar's edge, the drawer, a board's card, the preview, the zoom bar. So the window's
// gotpointercapture and lostpointercapture cover them all, and whatever is dragged next (shell.svelte).
// #404 (Duncan, 2026-11-26): a finger's touch takes the pointer too, every one of them (the browser does it), so this
// runs on every tap on a phone. A field being typed in keeps its caret: taking it closes an Android phone's keyboard
// the moment the finger lands, the page slides down as the keyboard goes, and the tap ends on whatever slid under it,
// a day's header or the Time Log's own, instead of the field tapped. Pressing Next on the keyboard never touched
// the screen, so it worked.

const FIELDS = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

function isTyping() {
	return Boolean(document.activeElement?.closest(FIELDS));
}

/** Something took the pointer: nothing more on the page is selected until it lets go. */
export function holdText() {
	document.documentElement.classList.add('select-none');
	if (!isTyping()) getSelection()?.removeAllRanges();
}

/** The pointer is let go: text can be selected again. */
export function freeText() {
	document.documentElement.classList.remove('select-none');
}
