// Selecting several photos (#402), as Justin decided on #287 (2026-11-24): holding a photo still, without dragging,
// starts selecting; while selecting, taps add (and a second tap takes one off); on a computer Ctrl-click (Cmd on a
// Mac) and Shift-click work too. A selection stays within one panel. What can be done to all of them at once is on the
// Selection bar (selection.svelte): one description for all, Delete and Move to…; a dragged selection drops into any
// stage of any photo panel (sortable.ts), in the order it had. PDFs and videos in a group (#327) are selected the
// same way. One per LookState, so it outlives the panels' redraws.
import type { PanelType } from './look.data';

/** The keys held with a click: what tells a tap from a Ctrl, Cmd or Shift click. */
export type ClickKeysType = Pick<MouseEvent, 'shiftKey' | 'ctrlKey' | 'metaKey'>;

/** The Selection bar's sheet that is open: replacing the descriptions some have, the one description, Move to…. */
export type SelectionSheetType = '' | 'replace' | 'describe' | 'move';

export class Selection {
	/** The panel the selection is in; empty while nothing is selected. */
	panelId = $state('');
	/** The selected photos' ids, in the order they were picked (what is shown, moved or stacked reads them in the
	 * panel's order, `photosIn`). */
	ids = $state<string[]>([]);
	/** A shut photo panel a dragged selection rested on, opened beside the one the photos came from. It stays open
	 * once the selection ends, to show where the photos went, until a panel's header is tapped. */
	alsoOpen = $state('');
	sheet = $state<SelectionSheetType>('');
	/** Until when a click is the end of a drag or a hold, not a tap anywhere else (sortable.ts sets it). */
	quietUntil = 0;
	// The photo a Shift-click counts from.
	#anchor = '';

	get isOn() {
		return this.ids.length > 0;
	}

	has(id: string | undefined) {
		return id !== undefined && this.ids.includes(id);
	}

	/** Whether this panel's photos are being selected. */
	isIn(panelId: string) {
		return this.isOn && this.panelId === panelId;
	}

	/** A photo held still and let go: it starts a selection; while its panel is selecting it is a slow tap. */
	hold(panelId: string, id: string) {
		this.#toggle(panelId, id);
	}

	/**
	 * What a click on a photo does to the selection. True when it was taken as selecting, so the photo does not open:
	 * a Shift-click, a Ctrl or Cmd click, or any tap while its panel is selecting.
	 */
	tap(panel: PanelType, id: string, keys: ClickKeysType) {
		if (keys.shiftKey) {
			this.#range(panel, id);
			return true;
		}
		if (keys.ctrlKey || keys.metaKey || this.isIn(panel.id)) {
			this.#toggle(panel.id, id);
			return true;
		}
		return false;
	}

	end() {
		this.panelId = '';
		this.ids = [];
		this.sheet = '';
		this.#anchor = '';
	}

	/** The selected photos that are still there, in the order they sit: stage by stage, left to right. */
	photosIn(panels: PanelType[]) {
		return panels.flatMap((panel) => photosOf(panel)).filter((photo) => this.has(photo.id));
	}

	#start(panelId: string, id: string) {
		this.panelId = panelId;
		this.ids = [id];
		this.#anchor = id;
	}

	// On and off in its own panel; in another panel it starts a new selection there.
	#toggle(panelId: string, id: string) {
		if (!this.isIn(panelId)) return this.#start(panelId, id);
		this.ids = this.has(id) ? this.ids.filter((each) => each !== id) : [...this.ids, id];
		// Shift counts from the last one picked that is still selected.
		this.#anchor = this.ids.at(-1) ?? '';
		if (!this.ids.length) this.end();
	}

	// Every photo of the panel from the last one picked to this one, in the panel's order.
	#range(panel: PanelType, id: string) {
		const order = photosOf(panel).map((photo) => photo.id);
		if (!this.isIn(panel.id) || !order.includes(this.#anchor)) return this.#start(panel.id, id);
		const [from, to] = [order.indexOf(this.#anchor), order.indexOf(id)].toSorted((a, b) => a - b);
		this.ids = [...new Set([...this.ids, ...order.slice(from, to + 1)])];
	}
}

function photosOf(panel: PanelType) {
	return (panel.groups ?? []).flatMap((group) => group.photos);
}
