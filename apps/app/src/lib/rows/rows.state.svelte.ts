// The sync loop (glossary "Sync loop"; spec #179 "The one place where the UI meets rows"; #183). About a second after
// the last change, it asks the mapper for the screens' rows, compares them with the rows the server last confirmed,
// and sends only the difference through the save command as one batch. A confirmed batch moves the confirmed rows
// forward. A batch that could not reach the server stays as it is, change ids and all, and is sent again with growing
// waits, or at once on Retry, so a lost reply never counts twice. A batch the server refused is dropped; Retry then
// takes the server's rows back in place of the refused change. Its state is what the header's cloud shows.
//
// It knows nothing of the screens: `read` (the mapper's rows), `send` (the save command), `fetch` (the lists query)
// and `take` (the mapper writing rows into the screens) are handed to it.
import type {
	BatchType,
	RowChangeType,
	RowType,
	SavedRowType,
	SaveResultType
} from './rows.schema';
import { toApplied, toChanges } from './rows.utils';

export type SaveStateType = 'saved' | 'saving' | 'failed';

/** What the header's cloud reads. */
export type SaveStatusType = { state: SaveStateType; reason: string; retry(): void };

export type SyncOptionsType = {
	read: () => RowType[];
	send: (batch: BatchType) => Promise<SaveResultType>;
	fetch: () => Promise<SavedRowType[]>;
	take: (rows: SavedRowType[]) => void;
	/** How long after the last change a batch goes. */
	delay?: number;
};

const OFFLINE =
	'The server cannot be reached. Your changes are kept here and sent again by themselves.';

/** The wait before the next try after `attempt` failed tries: 2, 4, 8 … up to 30 seconds. */
export function waitOf(attempt: number) {
	return Math.min(30_000, 1000 * 2 ** attempt);
}

export class SyncLoop implements SaveStatusType {
	state = $state<SaveStateType>('saved');
	reason = $state('');

	#options: SyncOptionsType;
	#confirmed: RowType[] = [];
	// The batch on its way, or the one that could not reach the server and waits to go again.
	#batch: RowChangeType[] | undefined;
	#isSending = false;
	#isRefused = false;
	#attempt = 0;
	#timer: ReturnType<typeof setTimeout> | undefined;

	constructor(options: SyncOptionsType) {
		this.#options = options;
	}

	/** Takes the server's rows into the screens; what they then show is what the server has. */
	load(rows: SavedRowType[]) {
		this.#options.take(rows);
		this.#confirmed = this.#options.read();
	}

	/** Whether something is not on the server yet: closing the tab now would lose it. */
	get isPending() {
		return Boolean(this.#batch || this.#timer || this.#isSending || this.#isRefused);
	}

	/** The screens changed: a batch goes about a second after the last change. */
	notice() {
		if (this.#batch || this.#isSending) return;
		if (toChanges(this.#confirmed, this.#options.read(), () => '').length === 0) {
			if (!this.#isRefused) this.#settle();
			return;
		}
		this.state = 'saving';
		this.#schedule(this.#options.delay ?? 1000);
	}

	/** Retry: send the waiting batch now, or after a refusal take the server's rows back. */
	retry() {
		clearTimeout(this.#timer);
		this.#timer = undefined;
		if (this.#isRefused) return void this.refresh(true);
		void this.#flush();
	}

	/**
	 * Takes in what others saved (on returning to the tab, on opening a record), only while nothing here waits to be
	 * sent, so it never overwrites a change of this device. `isForced` drops a refused change for the server's rows.
	 */
	async refresh(isForced = false) {
		if (this.isPending && !(isForced && this.#isRefused)) return;
		const rows = await this.#options.fetch();
		if (this.#batch || this.#timer || this.#isSending) return;
		this.#isRefused = false;
		this.load(rows);
		this.#settle();
	}

	#settle() {
		this.state = 'saved';
		this.reason = '';
	}

	#schedule(wait: number) {
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => {
			this.#timer = undefined;
			void this.#flush();
		}, wait);
	}

	async #flush() {
		if (this.#isSending) return;
		this.#batch ??= toChanges(this.#confirmed, this.#options.read());
		if (this.#batch.length === 0) {
			this.#batch = undefined;
			if (!this.#isRefused) this.#settle();
			return;
		}
		const changes = this.#batch;
		this.#isSending = true;
		this.state = 'saving';
		let result: SaveResultType;
		try {
			result = await this.#options.send({ changes });
		} catch {
			this.#isSending = false;
			this.state = 'failed';
			this.reason = OFFLINE;
			this.#schedule(waitOf(this.#attempt));
			this.#attempt += 1;
			return;
		}
		this.#isSending = false;
		this.#attempt = 0;
		this.#batch = undefined;
		if (!result.isSaved) {
			this.#isRefused = true;
			this.state = 'failed';
			this.reason = result.reason;
			return;
		}
		this.#isRefused = false;
		this.#confirmed = toApplied(this.#confirmed, changes);
		// Whatever changed while the batch was on its way goes next.
		if (toChanges(this.#confirmed, this.#options.read(), () => '').length > 0) this.#schedule(0);
		else this.#settle();
	}
}
