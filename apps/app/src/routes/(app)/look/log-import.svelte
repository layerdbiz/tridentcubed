<script lang="ts">
	// Import a Time Log (#359): a log kept somewhere else brought into the Time Log panel, so it is not typed again.
	// First its words: pasted from Notes, an email, a message, Word or a PDF, or read from its file (log-files.ts).
	// Then the check: every entry read, with its date, time and activity to fix and a switch to leave it out, what
	// to check on it said beside it (no date, a guessed day or month, past midnight, moved to the next day, an
	// overlap, already in the time log, read twice), and the lines that held no entry listed under them, so nothing
	// is left out unseen. Add puts the chosen entries into the days (log-import.ts `addToLog`); what was typed in the
	// time log is never changed or moved.
	//
	// Decided by default on 2026-11-26, for Justin to change (#359 asks him three questions): pasted text comes first;
	// imported entries join today's Time Log as entries (time and activity), not the stages, until #285 settles how
	// the two join; and what was typed wins, since the import only adds. A range keeps its start as the entry's time and
	// says its end in the activity, "Loading (until 02:15)". The pasted text and the file are not kept: the Time Log
	// has no place for a file yet. A photo of a handwritten log, or a scan, needs its writing read, which is not built.
	import { Button, Compact, Dialog, Icon, Switch, Textarea } from '@layerd/ui';
	import type { DayType } from './look.data';
	import { readLogFile } from './log-files';
	import {
		notesOf,
		readLog,
		toRows,
		toTypedClock,
		type ImportRowType,
		type SkippedLineType
	} from './log-import';

	let {
		days,
		year,
		onadd,
		onclose
	}: {
		/** The Time Log's days, to tell what is already in it. */
		days: DayType[];
		/** The year a date written without one is in. */
		year: number;
		/** The chosen entries, as fixed, to add. */
		onadd: (rows: ImportRowType[]) => void;
		onclose: () => void;
	} = $props();

	let text = $state('');
	let step = $state<'words' | 'check'>('words');
	let rows = $state<ImportRowType[]>([]);
	let skipped = $state<SkippedLineType[]>([]);
	let reason = $state('');
	let isReading = $state(false);
	let picker = $state<HTMLInputElement>();

	const chosen = $derived(rows.filter((row) => row.isChosen));
	const toCheck = $derived(
		rows.filter((row) => row.isChosen && notesOf(row, rows, days).length).length
	);

	function read() {
		const log = readLog(text, { year });
		rows = toRows(log, days, () => crypto.randomUUID());
		skipped = log.skipped;
		reason = rows.length
			? ''
			: 'No times found. Each entry needs its time at the start or the end of its line, like 07:30 Arrived.';
		if (rows.length) step = 'check';
	}

	async function choose(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		isReading = true;
		reason = '';
		try {
			const words = await readLogFile(file);
			if ('reason' in words) reason = words.reason;
			else {
				text = words.text;
				read();
			}
		} catch {
			reason = `${file.name} could not be read. Copy its text and paste it.`;
		} finally {
			isReading = false;
		}
	}

	const COUNT = (count: number, one: string, many = `${one}s`) =>
		`${count} ${count === 1 ? one : many}`;
</script>

<Dialog
	label="Import a Time Log"
	variant="tall"
	{onclose}
>
	{#snippet header()}
		<header class="-mx-5 flex shrink-0 items-start gap-2 border-b border-neutral-200 px-5 pb-3">
			<div class="min-w-0 flex-1">
				<h2 class="text-xl font-bold">
					{step === 'words' ? 'Import a Time Log' : 'Check the Entries'}
				</h2>
				<p class="text-sm text-neutral-600">
					{#if step === 'words'}
						Paste it, or choose its file
					{:else}
						{COUNT(chosen.length, 'entry', 'entries')} to add{toCheck
							? `, ${toCheck} to check`
							: ''}
					{/if}
				</p>
			</div>
			<Button
				neutral
				ghost
				md
				icon="icon-[mdi--close]"
				aria-label="Close"
				onclick={onclose}
			/>
		</header>
	{/snippet}

	{#if step === 'words'}
		<div class="space-y-3 py-4">
			<Textarea
				label="Time Log"
				bind:value={text}
				rows={10}
				autocapitalize="sentences"
				spellcheck
			/>
			<p class="text-sm text-neutral-600">
				From Notes, an email, a message, Word or a PDF. A line with a time becomes an entry, and a
				line with a date starts its day.
			</p>
			<input
				bind:this={picker}
				type="file"
				class="hidden"
				accept=".txt,.md,.docx,.doc,.pdf,.csv,.tsv,.xlsx,.xls,.ods,.numbers,text/plain,image/*"
				onchange={choose}
			/>
			<Button
				secondary
				lite
				sm
				icon={isReading ? 'icon-[mdi--loading]' : 'icon-[mdi--file-document-outline]'}
				label={isReading ? 'Reading…' : 'Choose a File'}
				disabled={isReading}
				onclick={() => picker?.click()}
			/>
			{#if reason}
				<p
					class="flex items-start gap-2 rounded-2xl bg-warning/10 px-3 py-2 text-sm text-warning"
					role="status"
				>
					<Icon
						icon="icon-[mdi--alert-circle-outline]"
						class="mt-0.5 size-4 shrink-0"
					/>
					{reason}
				</p>
			{/if}
		</div>
	{:else}
		<ol class="space-y-2 py-4">
			{#each rows as row, index (row.id)}
				{@const notes = notesOf(row, rows, days)}
				<li
					class="rounded-2xl border border-neutral-200 p-3 transition-opacity {row.isChosen
						? ''
						: 'opacity-60'}"
				>
					<div class="flex items-center gap-2">
						<Switch
							sm
							label="Add entry {index + 1}"
							bind:checked={row.isChosen}
						/>
						<Compact
							class="min-w-0 flex-1"
							type="date"
							label="Date of entry {index + 1}"
							bind:value={row.date}
						/>
						<Compact
							class="w-20! shrink-0 text-center tabular-nums"
							inputmode="numeric"
							maxlength={5}
							placeholder="07:30"
							label="Time of entry {index + 1}"
							value={row.time}
							onchange={(event) => {
								row.time = toTypedClock(event.currentTarget.value);
								event.currentTarget.value = row.time;
							}}
						/>
					</div>
					<Compact
						class="mt-2"
						label="Activity of entry {index + 1}"
						placeholder="What happened"
						autocapitalize="sentences"
						bind:value={row.activity}
					/>
					<p class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
						<span class="text-neutral-500">Line {row.line}</span>
						{#each notes as note (note.kind)}
							<span
								class="flex items-center gap-1 {note.kind === 'in-log' || note.kind === 'twice'
									? 'text-neutral-500'
									: 'text-warning'}"
							>
								<Icon
									icon="icon-[mdi--alert-circle-outline]"
									class="size-3.5"
								/>
								{note.text}
							</span>
						{/each}
					</p>
				</li>
			{/each}
		</ol>
		{#if skipped.length}
			<details class="mb-4 rounded-2xl bg-neutral-100 px-3 py-2 text-sm">
				<summary class="cursor-pointer text-neutral-600">
					{COUNT(skipped.length, 'line')} with no time, left out
				</summary>
				<ul class="mt-2 space-y-1 text-neutral-500">
					{#each skipped as line (line.line)}
						<li><span class="tabular-nums">Line {line.line}:</span> {line.text}</li>
					{/each}
				</ul>
			</details>
		{/if}
	{/if}

	{#snippet footer()}
		<div class="-mx-5 grid shrink-0 grid-cols-2 gap-2 border-t border-neutral-200 px-5 pt-3">
			{#if step === 'words'}
				<Button
					neutral
					lite
					sm
					width="full"
					label="Cancel"
					onclick={onclose}
				/>
				<Button
					primary
					heavy
					sm
					width="full"
					label="Read"
					disabled={!text.trim()}
					onclick={read}
				/>
			{:else}
				<Button
					neutral
					lite
					sm
					width="full"
					label="Back"
					onclick={() => (step = 'words')}
				/>
				<Button
					primary
					heavy
					sm
					width="full"
					label="Add {COUNT(chosen.length, 'Entry', 'Entries')}"
					disabled={!chosen.length}
					onclick={() => onadd(chosen)}
				/>
			{/if}
		</div>
	{/snippet}
</Dialog>
