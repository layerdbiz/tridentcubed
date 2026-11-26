<script lang="ts">
	/**
	 * @tags forms, switch, toggle
	 * @layout horizontal
	 */
	// An on/off switch (#378), the app's two hand-built ones made one: a stage's in-the-report switch (size `sm`) and a
	// panel card's (any other size). It is a native button with role="switch", so a tap, a click, Enter and Space all
	// switch it, a screen reader reads it as on or off, and a disabled fieldset round it switches it off too; the root
	// override is for that button and its thumb. On it is the theme's primary colour, off a light grey; `track` colours
	// it in both states instead, the way a panel card's switch takes its panel's state colour, until the state colours
	// can be worn as a `color` (#33).
	import { Component, type ComponentProps, type ComponentReturn } from '@layerd/ui';

	export interface SwitchProps extends ComponentProps {
		/** Whether it is on (bindable). */
		checked?: boolean;
		/** What it switches, read out by a screen reader. */
		label: string;
		/** A class that colours its track whether on or off, in place of the on and off colours. */
		track?: string;
		/** Called with its new state each time it is switched. */
		onchange?: (checked: boolean) => void;
		/** Runs before it switches, so its owner can keep the press from a row it sits in. */
		onclick?: (event: MouseEvent) => void;
	}

	let {
		checked = $bindable(false),
		label,
		track = undefined,
		size = undefined,
		onchange = undefined,
		onclick = undefined,
		...props
	}: SwitchProps = $props();

	// The base size `sm` (or the `sm` shorthand) draws the smaller switch of a row's header.
	const isSmall = $derived(size === 'sm' || props.sm === true);

	// A browser sends a disabled button no clicks; a click made in code still arrives, and switches nothing.
	function press(event: MouseEvent & { currentTarget: HTMLButtonElement }): void {
		onclick?.(event);
		if (event.currentTarget.matches(':disabled')) return;
		checked = !checked;
		onchange?.(checked);
	}
</script>

<Component
	{...props}
	{size}
>
	{#snippet component({ props }: { props: ComponentReturn })}
		<button
			{...props}
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			class={[
				'switch flex shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50',
				isSmall ? 'h-5 w-9' : 'h-6 w-11',
				checked ? 'justify-end' : 'justify-start',
				track ?? (checked ? 'bg-primary' : 'bg-slate-300'),
				props.class
			]}
			onclick={press}
			><span class={['rounded-full bg-white shadow', isSmall ? 'size-4' : 'size-5']}></span></button
		>
	{/snippet}
</Component>
