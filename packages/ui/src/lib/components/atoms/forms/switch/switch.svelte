<script lang="ts">
	/**
	 * @tags forms, switch, toggle
	 * @layout horizontal
	 */
	// An on/off switch (#378), the app's two hand-built ones made one: a stage's in-the-report switch (`sm`) and a panel
	// card's (`md`, the default). It is a native button with role="switch", so a tap, a click, Enter and Space all
	// switch it, a screen reader reads it as on or off, and a disabled fieldset round it switches it off too. On it is
	// the theme's primary colour, off a light grey; `track` colours it in both states instead, the way a panel card's
	// switch takes its panel's state colour.
	import { Component, type ComponentProps, type ComponentReturn } from '@layerd/ui';

	export interface SwitchProps extends Omit<ComponentProps, 'size'> {
		/** Whether it is on (bindable). */
		checked?: boolean;
		/** What it switches, read out by a screen reader. */
		label: string;
		/** A class that colours its track whether on or off, in place of the on and off colours. */
		track?: string;
		/** `sm` for a switch in a row's header, `md` for one on a card. */
		size?: 'sm' | 'md';
		/** Called with its new state each time it is switched. */
		onchange?: (checked: boolean) => void;
		/** Runs before it switches, so its owner can keep the press from a row it sits in. */
		onclick?: (event: MouseEvent) => void;
	}

	let {
		checked = $bindable(false),
		label,
		track = undefined,
		size = 'md',
		onchange = undefined,
		onclick = undefined,
		...props
	}: SwitchProps = $props();

	// A browser sends a disabled button no clicks; a click made in code still arrives, and changes nothing.
	function press(event: MouseEvent & { currentTarget: HTMLButtonElement }): void {
		if (event.currentTarget.matches(':disabled')) return;
		onclick?.(event);
		checked = !checked;
		onchange?.(checked);
	}
</script>

<Component {...props}>
	{#snippet component({ props }: { props: ComponentReturn })}
		<button
			{...props}
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			class={[
				'switch flex shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50',
				size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
				checked ? 'justify-end' : 'justify-start',
				track ?? (checked ? 'bg-primary' : 'bg-slate-300'),
				props.class
			]}
			onclick={press}
			><span class={['rounded-full bg-white shadow', size === 'sm' ? 'size-4' : 'size-5']}
			></span></button
		>
	{/snippet}
</Component>
