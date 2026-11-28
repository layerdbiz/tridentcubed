<script lang="ts">
	// Translate to English (#360), from a project's ⋮ menu: every text typed in the project that prints on its
	// report, the ones that read as Spanish first, each with its English to read, fix or type. The Translate button
	// asks the browser's own translator (translator.ts) for the English of each Spanish text that has none yet; each
	// says it came from the translator until someone changes it, and clearing one leaves that text in Spanish. Save
	// keeps the English beside the Spanish (translation.ts `toTranslations`) and the report prints it; the typed texts
	// stay as they are.
	//
	// Decided by default on 2026-11-26, for Justin to change: only on someone's ask, the person who saves reading
	// each English first; names and words in capitals keep their spelling; where the browser has no translator
	// (phones, Safari, Firefox) the English is typed here, or the project is opened in Chrome or Edge on a computer.
	import { Accordion, Button, Dialog, Icon, Textarea } from '@layerd/ui';
	import WindowHead from '#lib/releases/window-head.svelte';
	import type { LookState } from './look.state.svelte';
	import { toCountLabel } from './look.utils';
	import {
		englishBySource,
		isSpanish,
		keptWordsOf,
		textsOf,
		toTranslations,
		translateText,
		type TranslateType
	} from './translation';
	import { createTranslator, hasTranslator } from './translator';

	let {
		look,
		projectId,
		onclose
	}: {
		look: LookState;
		/** The project whose texts are put into English, its panels loaded. */
		projectId: string;
		onclose: () => void;
	} = $props();

	// The project's panels as they are now: opening a project loads them again, in new objects, after the sheet has
	// opened, so nothing here holds on to the first ones.
	const panels = $derived(look.workspaces[projectId] ?? []);

	// One text of the report: as typed, where it is, its English, and what the translator gave for it, if anything.
	type LineType = {
		source: string;
		where: string[];
		english: string;
		machine: string;
		isSpanish: boolean;
		isWhole: boolean;
	};

	function linesOf(): LineType[] {
		const saved = englishBySource(panels);
		return textsOf(panels).map((text) => ({
			...text,
			english: saved.get(text.source) ?? '',
			machine: '',
			isSpanish: saved.has(text.source) || isSpanish(text.source),
			isWhole: true
		}));
	}

	let lines = $state<LineType[]>(linesOf());
	const spanish = $derived(lines.filter((line) => line.isSpanish));
	const others = $derived(lines.filter((line) => !line.isSpanish));
	const waiting = $derived(spanish.filter((line) => !line.english.trim()));

	let isTranslatorHere = $state<boolean>();
	void hasTranslator().then((answer) => (isTranslatorHere = answer));
	let progress = $state('');
	let reason = $state('');
	let translator: TranslateType | undefined;

	function isFromTranslator(line: LineType) {
		return Boolean(line.machine) && line.english === line.machine;
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
				// What someone typed while it worked stays.
				if (line.english.trim()) continue;
				line.english = english;
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
		const own = panels.find((panel) => panel.kind === 'project');
		if (own) {
			own.translations = toTranslations(
				own.translations ?? [],
				lines.map((line) => ({ source: line.source, english: line.english })),
				() => crypto.randomUUID()
			);
			look.saved();
			const count = lines.filter((line) => line.english.trim()).length;
			look.say(
				count
					? `The report prints ${toCountLabel(count, 'text')} in English`
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
			help={look.helpOf('translate.english')}
		/>
		{#if isFromTranslator(item)}
			<p
				class="mt-1.5 flex items-center gap-1 text-xs {item.isWhole
					? 'text-neutral-600'
					: 'text-warning'}"
			>
				<Icon
					icon={item.isWhole ? 'icon-[mdi--translate]' : 'icon-[mdi--alert-circle-outline]'}
					class="size-3.5"
				/>
				{item.isWhole
					? 'From the translator: read it before you save'
					: 'From the translator, and a name in it may have changed: check it'}
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
				? `${toCountLabel(spanish.length, 'text')} in Spanish, ${toCountLabel(spanish.length - waiting.length, 'with English', 'with English')}`
				: 'Nothing typed yet'}
			{onclose}
		/>
	{/snippet}

	<div class="space-y-3 py-4">
		<p class="text-sm text-neutral-600">
			The report prints the English in place of each text. What the team typed stays as it is. Read
			each English before you save it.
		</p>
		{#if isTranslatorHere === false}
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
		{:else if isTranslatorHere && spanish.length}
			<Button
				secondary
				lite
				sm
				icon={progress ? 'icon-[mdi--loading]' : 'icon-[mdi--translate]'}
				label={progress ||
					(waiting.length ? `Translate ${toCountLabel(waiting.length, 'Text')}` : 'All Translated')}
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
				label="{toCountLabel(others.length, 'text')} in English, printed as typed"
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
