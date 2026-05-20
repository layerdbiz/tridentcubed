<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { Button, Component, Input, Text, Textarea, mq } from '@layerd/ui';
	import pageSource from './+page.svelte?raw';
	import * as demoNav from './nav.svelte.ts';
	import { createDemoModel } from './demo.model';
	import { persist } from './demo.persist';
	import { getCachedDemoData, readDemoDataCache } from './demo.seed';
	import type { DemoSeedType } from './demo.remote';

	const initialDemoSeed = readDemoDataCache();
	let demoSeed = $state<DemoSeedType | null>(initialDemoSeed);
	let demoError = $state<string | null>(null);
	let isSeedLoading = $state(initialDemoSeed === null);

	const currentView = $derived(
		demoNav.getDemoView(page.url.searchParams.get(demoNav.DEMO_VIEW_PARAM)),
	);
	const model = $derived(createDemoModel(demoSeed));
	const recordInput = $derived(model.currentInput ?? null);
	const explicitInput = $derived(model.explicitInput ?? null);
	const booleanInput = $derived(model.inputs[2] ?? null);

	let recordDraft = $state<string | null>(null);
	let explicitDraft = $state<string | null>(null);

	const recordValue = $derived(recordDraft ?? recordInput?.value ?? '');
	const explicitValue = $derived(explicitDraft ?? explicitInput?.value ?? '');
	const recordHeading = 'persist={input}';
	const explicitHeading = 'persist="inputs.input_2"';
	const desktopMqHeading = $derived.by(() => {
		if (mq.lg) return 'Desktop View (lg)';
		if (mq.xl) return 'Desktop View (xl)';
		return 'Desktop View (xxl)';
	});
	const mqHeading = $derived.by(() => {
		if (mq.base) return 'Canonical Base / Content Projection';
		if (mq.sm) return 'Mobile View (sm)';
		if (mq.md) return 'Tablet View (md)';
		return desktopMqHeading;
	});
	const mqCopy = $derived.by(() => {
		if (mq.base) {
			return 'This is the stable base projection. It stays simple on first render, then the resolved MQ bucket enhances the same route.';
		}

		if (mq.sm) {
			return 'Mobile comes first here. The route stays stacked, and the layout shell keeps the nav out of the content rail.';
		}

		if (mq.md) {
			return 'Tablet keeps the same route structure while the content gains more room inside the existing rail system.';
		}

		return 'Larger screens keep the same content flow while the layout owns the persistent navigation rail.';
	});
	const seedSource = $derived(model.source || 'local fallback');
	const seedStatus = $derived.by(() => {
		if (demoError) {
			return 'Remote seed unavailable. Using the local fallback model.';
		}

		if (demoSeed) {
			return 'Remote seed cached for this session.';
		}

		if (isSeedLoading) {
			return 'Fetching the remote seed.';
		}

		return 'Using the local fallback model.';
	});

	function toFieldValue(event: Event): string {
		const target = event.target;

		if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
			return target.value;
		}

		return '';
	}

	function handleRecordInput(event: Event): void {
		recordDraft = toFieldValue(event);
	}

	function handleExplicitInput(event: Event): void {
		explicitDraft = toFieldValue(event);
	}

	function resetRecordOverlay(): void {
		if (!recordInput) return;
		persist.remove(recordInput.persistPath);
		recordDraft = recordInput.seedValue;
	}

	function resetExplicitOverlay(): void {
		if (!explicitInput) return;
		persist.remove(explicitInput.persistPath);
		explicitDraft = explicitInput.seedValue;
	}

	function clearInputsScope(): void {
		persist.clear();
		if (recordInput) {
			recordDraft = recordInput.seedValue;
		}
		if (explicitInput) {
			explicitDraft = explicitInput.seedValue;
		}
	}

	onMount(() => {
		if (demoSeed) {
			isSeedLoading = false;
			return;
		}

		let isCancelled = false;

		void getCachedDemoData()
			.then((nextSeed) => {
				if (isCancelled) return;

				demoSeed = nextSeed;
				demoError = null;
			})
			.catch((error: unknown) => {
				if (isCancelled) return;

				demoError = error instanceof Error
					? error.message
					: 'Unable to load the remote demo seed.';
			})
			.finally(() => {
				if (!isCancelled) {
					isSeedLoading = false;
				}
			});

		return () => {
			isCancelled = true;
		};
	});
</script>

<Text h1="Demo" />

<Text
	p="This route now leans on the shared field components, the route layout owns the shell, and the demo/code switch is driven by the play-style route nav."
	class="mt-2 max-w-3xl text-neutral"
/>

{#if currentView === 'code'}
	<Component tag="section" rail="full" base lite class="py-6">
		<Component rail="content">
			<Text h2="+page.svelte" />
			<Text
				p="This is the exact page source for the current demo route."
				class="mt-2 text-neutral"
			/>

			<Textarea
				sm
				label="+page.svelte"
				value={pageSource}
				readonly
				rows={24}
				spellcheck={false}
				class="mt-4 font-mono"
			/>
		</Component>
	</Component>
{:else}
	<Component tag="section" gap="1.5rem" class="pt-6">
		<Component tag="section" rail="full" secondary lite class="py-6">
			<Component rail="content" items="start stretch" gap="1rem">
				{#snippet left()}
					<Text h2={mqHeading} />
					<Text p={mqCopy} class="mt-2 text-neutral" />
				{/snippet}

				{#snippet right()}
					<Text small={`Source: ${seedSource}`} class="text-neutral" />
					<Text small={seedStatus} class="mt-1 text-neutral" />

					{#if demoError}
						<Text small={demoError} class="mt-1 text-neutral" />
					{/if}
				{/snippet}
			</Component>
		</Component>

		<Component tag="section" rail="full" base lite class="py-6">
			<Component rail="content">
				<Text small="Record target" class="uppercase text-neutral" />
				<Text h2={recordHeading} class="mt-2" />
				<Text
					p={`Uses the record metadata to resolve ${(recordInput?.persistPath || 'inputs.input_1')}.value.`}
					class="mt-2 text-neutral"
				/>

				{#if recordInput}
					<Input
						sm
						variant="text"
						label={recordInput.label}
						value={recordValue}
						placeholder={recordInput.placeholder || ' '}
						persist={recordInput}
						oninput={handleRecordInput}
						class="mt-4"
					/>

					<Text small={`Seed: ${recordInput.seedValue || 'empty'}`} class="mt-4 text-neutral" />
					<Text small={`Current: ${recordValue || 'empty'}`} class="mt-1 text-neutral" />
					<Text small={`Path: ${recordInput.persistPath}.value`} class="mt-1 text-neutral" />

					<Button
						sm
						outline
						variant="text"
						label="Remove record path"
						onclick={resetRecordOverlay}
						class="mt-4"
					/>
				{/if}
			</Component>
		</Component>

		<Component tag="section" rail="full" base lite class="py-6">
			<Component rail="content">
				<Text small="String path" class="uppercase text-neutral" />
				<Text h2={explicitHeading} class="mt-2" />
				<Text
					p="Explicit base-path mode still lets the form field choose the final path segment."
					class="mt-2 text-neutral"
				/>

				{#if explicitInput}
					<Input
						sm
						variant="text"
						label={explicitInput.label}
						value={explicitValue}
						placeholder={explicitInput.placeholder || ' '}
						persist={explicitInput.persistPath}
						oninput={handleExplicitInput}
						class="mt-4"
					/>

					<Text small={`Seed: ${explicitInput.seedValue || 'empty'}`} class="mt-4 text-neutral" />
					<Text small={`Current: ${explicitValue || 'empty'}`} class="mt-1 text-neutral" />
					<Text small={`Path: ${explicitInput.persistPath}.value`} class="mt-1 text-neutral" />

					<Button
						sm
						outline
						variant="text"
						label="Remove explicit path"
						onclick={resetExplicitOverlay}
						class="mt-4"
					/>
				{/if}
			</Component>
		</Component>

		<Component tag="section" rail="full" neutral heavy invert class="py-6">
			<Component rail="content">
				<Text small="Boolean mode" class="uppercase" />
				<Text h2="persist" class="mt-2" />
				<Text
					p="This field uses generated component-scope persistence. Type, leave the route, and come back to the same route state."
					class="mt-2"
				/>

				<Input
					sm
					variant="text"
					label={booleanInput?.label || 'Boolean mode'}
					placeholder={booleanInput?.placeholder || ' '}
					persist
					class="mt-4"
				/>

				<Button
					sm
					primary
					variant="text"
					label="Clear inputs scope"
					onclick={clearInputsScope}
					class="mt-4"
				/>
			</Component>
		</Component>
	</Component>
{/if}
