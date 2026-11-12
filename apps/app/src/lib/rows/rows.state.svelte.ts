// The sync loop (glossary "Sync loop"; spec #179 "The one place where the UI meets rows"; #183). About a second after
// the last change, it asks the mapper for the screens' rows, compares them with the rows the server last confirmed,
// and sends only the difference through the save command as one batch. A confirmed batch moves the confirmed rows
// forward. A batch that could not reach the server stays as it is, change ids and all, and is sent again with growing
// waits, or at once on Retry, so a lost reply never counts twice. When the server refuses a batch, only the change it
// refused is held back (the state is Not saved, with the reason) and the rest goes again at once; later edits keep
// saving. A held change goes again once the User changes it, is let go when they undo it, and is sent again on Retry
// with everything else still unsaved; refused on Retry too, the screens take the server's rows back. Its state is
// what the header's cloud shows.
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
import { toApplied, toChanges, toMerged, toSendable } from './rows.utils';

export type SaveStateType = 'saved' | 'saving' | 'failed';

/** What the header's cloud reads. */
export type SaveStatusType = { state: SaveStateType; reason: string; retry(): void };

export type SyncOptionsType = {
	read: () => RowType[];
	send: (batch: BatchType) => Promise<SaveResultType>;
	fetch: () => Promise<SavedRowType[]>;
	take: (rows: SavedRowType[]) => void;
	/** The mapper writing the columns only the server sets, from an applied batch, into the screens (#186). */
	takeReads?: (reads: RowType[]) => void;
	/** How long after the last change a batch goes. */
	delay?: number;
};

const OFFLINE =
	'The server cannot be reached. Your changes are kept here and sent again by themselves.';

/** Why a batch did not arrive: the server's own words when it answered with an error, else the connection. */
function toFailure(error: unknown) {
	const { status, body } = (error ?? {}) as { status?: number; body?: { message?: string } };
	if (!status) return OFFLINE;
	if (status === 401)
		return 'You are signed out. Sign in again in another tab; your changes are kept here.';
	return `${body?.message ?? 'The server could not save it.'} Your changes are kept here and sent again by themselves.`;
}

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
	// The changes the server refused, held back until the User changes or undoes them, or presses Retry.
	#held: RowChangeType[] = [];
	#heldReason = '';
	// Retry sent the held changes again; refused again, the screens take the server's rows back.
	#isRetrying = false;
	#isGivingUp = false;
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

	/**
	 * Takes part of the server's rows into the screens (#186: a project's rows as it opens): `take` writes them in,
	 * and they count as confirmed, so they are not sent back. `isPart` names the rows the part covers. Whatever else
	 * waits to be sent still goes, and so does anything the screens work out again from the part (a percent).
	 */
	merge(
		rows: SavedRowType[],
		isPart: (row: RowType) => boolean,
		take: (rows: SavedRowType[]) => void
	) {
		take(rows);
		const taken = rows.map(({ table, id, values }) => ({ table, id, values }));
		this.#confirmed = toMerged(this.#confirmed, taken, isPart);
		this.notice();
	}

	/** Whether something is not on the server yet: closing the tab now would lose it. */
	get isPending() {
		return Boolean(this.#batch || this.#timer || this.#isSending || this.#held.length > 0);
	}

	/** The screens changed: a batch goes about a second after the last change. */
	notice() {
		if (this.#batch || this.#isSending) return;
		if (this.#toSend(() => '').length === 0) {
			if (this.#held.length === 0) this.#settle();
			return;
		}
		if (this.#held.length === 0) this.state = 'saving';
		this.#schedule(this.#options.delay ?? 1000);
	}

	/** Retry: send now what waits, the changes the server refused included. */
	retry() {
		clearTimeout(this.#timer);
		this.#timer = undefined;
		if (this.#held.length > 0) {
			this.#held = [];
			this.#isRetrying = true;
		}
		void this.#flush();
	}

	/**
	 * Takes in what others saved (on returning to the tab, on opening a record), only while nothing here waits to be
	 * sent, so it never overwrites a change of this device. `isForced` drops the refused changes for the server's rows.
	 */
	async refresh(isForced = false) {
		const isOnlyHeld = !this.#batch && !this.#timer && !this.#isSending;
		if (this.isPending && !(isForced && isOnlyHeld)) return;
		const rows = await this.#options.fetch();
		if (this.#batch || this.#timer || this.#isSending) return;
		this.#held = [];
		this.#isRetrying = false;
		this.#isGivingUp = false;
		this.load(rows);
		this.#settle();
	}

	// The changes from the confirmed rows to the screens', less those a refusal holds back.
	#toSend(createId?: () => string) {
		const { sendable, held } = toSendable(
			toChanges(this.#confirmed, this.#options.read(), createId),
			this.#held
		);
		this.#held = held;
		return sendable;
	}

	#settle() {
		this.state = 'saved';
		this.reason = '';
	}

	// Nothing more to send: Saved, or Not saved while a refused change is held back.
	#rest() {
		this.#isRetrying = false;
		if (this.#isGivingUp) return void this.refresh(true);
		if (this.#held.length === 0) return this.#settle();
		this.state = 'failed';
		this.reason = this.#heldReason;
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
		this.#batch ??= this.#toSend();
		if (this.#batch.length === 0) {
			this.#batch = undefined;
			return this.#rest();
		}
		const changes = this.#batch;
		this.#isSending = true;
		if (this.#held.length === 0) this.state = 'saving';
		let result: SaveResultType;
		try {
			result = await this.#options.send({ changes });
		} catch (error) {
			this.#isSending = false;
			this.state = 'failed';
			this.reason = toFailure(error);
			this.#schedule(waitOf(this.#attempt));
			this.#attempt += 1;
			return;
		}
		this.#isSending = false;
		this.#attempt = 0;
		this.#batch = undefined;
		if (!result.isSaved) {
			// Only the refused change is held back (all of them when the server cannot say); the rest goes again.
			const ids = new Set(result.refused ?? []);
			const refused = ids.size > 0 ? changes.filter((change) => ids.has(change.changeId)) : changes;
			this.#held.push(...refused);
			this.#heldReason = result.reason;
			if (this.#isRetrying) this.#isGivingUp = true;
			this.state = 'failed';
			this.reason = result.reason;
			if (refused.length < changes.length) this.#schedule(0);
			else this.#rest();
			return;
		}
		this.#confirmed = toApplied(this.#confirmed, changes);
		if (result.reads?.length) this.#options.takeReads?.(result.reads);
		// Whatever changed while the batch was on its way goes next.
		if (this.#toSend(() => '').length > 0) this.#schedule(0);
		else this.#rest();
	}
}
