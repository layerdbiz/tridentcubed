<!-- A size in pixels (#342), typed in the library's Input. What is typed is kept as typed and the size follows once
     it is a whole number inside the limits, so a half-typed "4" never jumps the screen. -->
<script lang="ts">
	import { Input } from '@layerd/ui';
	import { untrack } from 'svelte';

	type AmountProps = { label: string; value: number; least: number; most: number };

	let { label, value = $bindable(), least, most }: AmountProps = $props();

	let text = $state(untrack(() => String(value)));

	$effect(() => {
		const amount = Number(text);
		if (text !== '' && Number.isInteger(amount) && amount >= least && amount <= most)
			value = amount;
	});

	// A size set elsewhere (a link, Show all) shows here too.
	$effect(() => {
		const now = value;
		if (Number(untrack(() => text)) !== now) text = String(now);
	});
</script>

<Input
	sm
	type="number"
	inputmode="numeric"
	{label}
	min={least}
	max={most}
	step={10}
	help="{least} to {most} px"
	bind:value={text}
/>
