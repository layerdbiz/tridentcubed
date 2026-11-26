<!-- A row of choices, the starter's segmented buttons: one or several picked, each a pressed button. -->
<script
	lang="ts"
	generics="T extends string"
>
	type ChoicesProps = {
		label: string;
		options: { value: T; label: string }[];
		picked: T[];
		onpick: (value: T) => void;
	};

	let { label, options, picked, onpick }: ChoicesProps = $props();
</script>

<div
	class="choices"
	role="group"
	aria-label={label}
>
	{#each options as option (option.value)}
		<button
			type="button"
			aria-pressed={picked.includes(option.value)}
			onclick={() => onpick(option.value)}>{option.label}</button
		>
	{/each}
</div>

<style>
	.choices {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	button {
		min-height: 30px;
		padding: 0 11px;
		border: 0;
		border-radius: 9px;
		background: var(--bar-soft);
		color: var(--bar-fg);
		font-size: 12.5px;
		font-weight: 600;
		cursor: pointer;
	}
	button:hover {
		background: color-mix(in srgb, var(--bar-soft), white 8%);
	}
	button[aria-pressed='true'] {
		background: var(--accent);
		color: #fff;
	}
	button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
</style>
