<script lang="ts">
	/**
	 * @tags forms, switch, toggle
	 * @layout horizontal
	 */
	// An on/off switch (#378), the app's two hand-built ones made one: a stage's in-the-report switch and a panel
	// card's. It is a native button with role="switch", so a tap, a click, Enter and Space all switch it, a screen
	// reader reads it as on or off, and a disabled fieldset round it switches it off too; the root override is for
	// that button and its thumb.
	//
	// Its look is set from outside (Justin, 2026-11-26), like the Button's: it is the base component, so on it wears
	// the `color` it is given (primary unless told) in its `appearance` (heavy unless told), with the shorthands
	// (`accent`, `lite`) as well; off it is the theme's neutral. `size` (or `sm`, `lg`...) scales it on the base
	// ladder. `track` colours it in both states instead, the way a panel card's switch takes its panel's state colour,
	// until the state colours can be worn as a `color` (#33); `class` lands on the switch itself.
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
		color = 'primary',
		appearance = 'heavy',
		onchange = undefined,
		onclick = undefined,
		...props
	}: SwitchProps = $props();

	// A colour or appearance given as a shorthand (`accent`, `lite`) wins over the defaults, as on any base component.
	const COLORS = ['base', 'neutral', 'primary', 'secondary', 'accent'] as const;
	const APPEARANCES = ['heavy', 'lite', 'outline', 'ghost', 'glass', 'gradient'] as const;
	const onColor = $derived(COLORS.find((each) => props[each] === true) ?? color);
	const onAppearance = $derived(APPEARANCES.find((each) => props[each] === true) ?? appearance);

	// What it wears now: its colour while on and nothing of its own while off (or with a track colour), so the off
	// grey and a track colour are not fought by a theme.
	const worn = $derived.by(() => {
		const rest: Record<string, unknown> = { ...props };
		for (const each of [...COLORS, ...APPEARANCES]) delete rest[each];
		return checked && !track ? { ...rest, color: onColor, appearance: onAppearance } : rest;
	});

	// A browser sends a disabled button no clicks; a click made in code still arrives, and switches nothing.
	function press(event: MouseEvent & { currentTarget: HTMLButtonElement }): void {
		onclick?.(event);
		if (event.currentTarget.matches(':disabled')) return;
		checked = !checked;
		onchange?.(checked);
	}
</script>

<Component {...worn}>
	{#snippet component({ props: root }: { props: ComponentReturn })}
		<button
			{...root}
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			class={[
				'switch flex h-(--switch-h) w-[calc(var(--switch-h)_*_2_-_0.25rem)] shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50',
				checked ? 'justify-end' : 'justify-start',
				track ?? (checked ? '' : 'bg-neutral-500'),
				root.class
			]}
			onclick={press}
			><span class="size-[calc(var(--switch-h)_-_0.25rem)] rounded-full bg-white shadow"
			></span></button
		>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	/* The track's height on the base size ladder; its width and thumb follow from it. */
	:global(.switch) {
		--switch-h: 1.5rem;
	}
	:global(.switch:where(.xxs)) {
		--switch-h: 0.875rem;
	}
	:global(.switch:where(.xs)) {
		--switch-h: 1rem;
	}
	:global(.switch:where(.sm)) {
		--switch-h: 1.25rem;
	}
	:global(.switch:where(.lg)) {
		--switch-h: 1.75rem;
	}
	:global(.switch:where(.xl)) {
		--switch-h: 2rem;
	}
	:global(.switch:where(.xxl)) {
		--switch-h: 2.5rem;
	}
</style>
