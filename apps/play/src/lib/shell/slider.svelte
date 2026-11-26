<!-- A slider with its value beside it, as in the Cover Page prototype's tune rows. -->
<script lang="ts">
	type SliderProps = {
		label: string;
		value: number;
		least: number;
		most: number;
		step?: number;
		unit?: string;
	};

	let { label, value = $bindable(), least, most, step = 1, unit = 'px' }: SliderProps = $props();
</script>

<label class="slider">
	<span class="label">{label}</span>
	<input
		type="range"
		min={least}
		max={most}
		{step}
		bind:value
	/>
	<span class="amount">{value} {unit}</span>
</label>

<style>
	.slider {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--bar-fg);
		font-size: 12.5px;
	}
	.label {
		flex: none;
		width: 52px;
		color: var(--bar-dim);
		font-weight: 600;
	}
	input {
		flex: 1;
		min-width: 0;
		height: 28px;
		margin: 0;
		accent-color: var(--accent);
	}
	.amount {
		flex: none;
		width: 64px;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		text-align: right;
	}
</style>
