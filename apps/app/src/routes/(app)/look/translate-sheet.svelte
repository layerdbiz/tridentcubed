<script lang="ts">
	// Translate to English (#360), from a project's ⋮ menu: every text typed in the project that prints on its
	// report, the ones that read as Spanish first, each with its English to read, fix or type. Translate All asks the
	// browser's own translator (translator.ts) for the English of each Spanish text that has none yet; what it gives
	// shows as made by the app, and typing over it keeps what was typed. Save keeps the English beside the Spanish
	// (translation.ts `toTranslations`) and the report prints it; the typed texts stay as they are.
	//
	// Decided by default on 2026-11-26, for Justin to change: only on someone's ask, the person who saves reading
	// each English first; names and words in capitals keep their spelling; where the browser has no translator
	// (phones, Safari, Firefox) the English is typed here, or the project is opened in Chrome or Edge on a computer.
	import { Accordion, Button, Dialog, Icon, Textarea } from '@layerd/ui';
	import WindowHead from '#lib/releases/window-head.svelte';
	import type { PanelType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import {
		isSpanish,
		keptWordsOf,
		textsOf,
		toTranslations,
		translateText,
		type TranslateType
	} from './translation';
	import { canTranslate, createTranslator } from './translator';

	let {
		look,
		panels,
		onclose
	}: {
		look: LookState;
		/** The project's panels, loaded. */
		panels: PanelType[];
		onclose: () => void;
	} = $props();

	// One text of the report: as typed, where it is, its English as typed or kept, and the translator's.
	type LineType = {
		source: string;
		where: string[];
		english: string;
		machine: string;
		isSpanish: boolean;
		isWhole: boolean;
	};

	// svelte-ignore state_referenced_locally
	const own = panels.find((panel) => panel.kind === 'project');
	// svelte-ignore state_referenced_locally
	const saved = new Map((own?.translations ?? []).map((item) => [item.source, item.english]));
	// svelte-ignore state_referenced_locally
	let lines = $state<LineType[]>(
		textsOf(panels).map((text) => ({
			...text,
			english: saved.get(text.source) ?? '',
			machine: '',
			isSpanish: saved.has(text.source) || isSpanish(text.source),
			isWhole: true
		}))
	);
	const spanish = $derived(lines.filter((line) => line.isSpanish));
	const others = $derived(lines.filter((line) => !line.isSpanish));
	const waiting = $derived(spanish.filter((line) => !englishOf(line)));

	let isAble = $state<boolean>();
	void canTranslate().then((able) => (isAble = able));
	let progress = $state('');
	let reason = $state('');
	let translator: TranslateType | undefined;

	function englishOf(line: LineType) {
		return line.english.trim() || line.machine;
	}

	function countOf(count: number, one: string, many = `${one}s`) {
		return `${count} ${count === 1 ? one : many}`;
	}

	async function translateAll() {
		const asked = [...waiting];
		reason = '';
		try {
			translator ??= await createTranslator((share) => {
				progress = `Getting the translator ready, ${Math.round(share * 100)}%`;
			});
			const kept = keptWordsOf(panels);
			for (const [index, line] of asked.entries()) {
				progress = `Translating ${index + 1} of ${asked.length}`;
				const { english, isWhole } = await translateText(line.source, {
					kept,
					translate: translator
				});
				line.machine = english;
				line.isWhole = isWhole;
			}
		} catch (error) {
			console.error('The browser’s translator failed.', error);
			reason = 'The translator could not finish. Type the English, or try again.';
		} finally {
			progress = '';
		}
	}

	function save() {
		if (own) {
			own.translations = toTranslations(
				own.translations ?? [],
				lines.map((line) => ({ source: line.source, english: englishOf(line) })),
				() => crypto.randomUUID()
			);
			look.saved();
			const count = lines.filter((line) => englishOf(line)).length;
			look.say(
				count
					? `The report prints ${countOf(count, 'text')} in English`
					: 'The report prints every text as typed'
			);
		}
		onclose();
	}
</script>

{#snippet line(item: LineType)}
	<li class="rounded-2xl border border-neutral-200 p-3">
		<p class="text-sm text-neutral-900">{item.source}</p>
		<p class="mt-0.5 text-xs text-neutral-600">{item.where.join(' · ')}</p>
		<Textarea
			class="mt-2"
			label="English"
			rows={1}
			autocapitalize="sentences"
			spellcheck
			bind:value={item.english}
			generated={item.machine || undefined}
		/>
		{#if item.machine && !item.isWhole && !item.english.trim()}
			<p class="mt-1.5 flex items-center gap-1 text-xs text-warning">
				<Icon
					icon="icon-[mdi--alert-circle-outline]"
					class="size-3.5"
				/>
				A name in it may have changed: check it
			</p>
		{/if}
	</li>
{/snippet}

<Dialog
	label="Translate to English"
	variant="tall"
	{onclose}
>
	{#snippet header()}
		<WindowHead
			title="Translate to English"
			note={lines.length
				? `${countOf(spanish.length, 'text')} in Spanish, ${countOf(spanish.length - waiting.length, 'with English', 'with English')}`
				: 'Nothing typed yet'}
			{onclose}
		/>
	{/snippet}

	<div class="space-y-3 py-4">
		<p class="text-sm text-neutral-600">
			The report prints the English in place of each text. What the team typed stays as it is. Read
			each English before you save it.
		</p>
		{#if isAble === false}
			<p
				class="flex items-start gap-2 rounded-2xl bg-neutral-100 px-3 py-2 text-sm text-neutral-700"
				role="status"
			>
				<Icon
					icon="icon-[mdi--information-outline]"
					class="mt-0.5 size-4 shrink-0"
				/>
				This browser can’t translate by itself. Type the English here, or open the project in Chrome or
				Edge on a computer, which can.
			</p>
		{:else if isAble && spanish.length}
			<Button
				secondary
				lite
				sm
				icon={progress ? 'icon-[mdi--loading]' : 'icon-[mdi--translate]'}
				label={progress ||
					(waiting.length ? `Translate ${countOf(waiting.length, 'Text')}` : 'All Translated')}
				disabled={Boolean(progress) || !waiting.length}
				onclick={translateAll}
			/>
		{/if}
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
		{#if !lines.length}
			<p class="text-sm text-neutral-500">
				Descriptions, Time Log entries and items print on the report once they are typed.
			</p>
		{/if}
		<ol class="space-y-2">
			{#each spanish as item (item.source)}
				{@render line(item)}
			{/each}
		</ol>
		{#if others.length}
			<Accordion
				class="text-sm"
				neutral
				lite
				label="{countOf(others.length, 'text')} in English, printed as typed"
			>
				<ol class="space-y-2">
					{#each others as item (item.source)}
						{@render line(item)}
					{/each}
				</ol>
			</Accordion>
		{/if}
	</div>

	{#snippet footer()}
		<div class="-mx-5 grid shrink-0 grid-cols-2 gap-2 border-t border-neutral-200 px-5 pt-3">
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
				label="Save"
				disabled={Boolean(progress)}
				onclick={save}
			/>
		</div>
	{/snippet}
</Dialog>
