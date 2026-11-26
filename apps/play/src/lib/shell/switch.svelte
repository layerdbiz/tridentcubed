<!-- An on/off switch with its name, as in the starter's Labels row. -->
<script lang="ts">
	type SwitchProps = { label: string; isOn: boolean };

	let { label, isOn = $bindable() }: SwitchProps = $props();
</script>

<button
	type="button"
	class="switch"
	role="switch"
	aria-checked={isOn}
	onclick={() => (isOn = !isOn)}
>
	<span class="label">{label}</span>
	<span class="track"></span>
</button>

<style>
	.switch {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		min-height: 30px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--bar-fg);
		font-size: 12.5px;
		font-weight: 600;
		cursor: pointer;
	}
	.track {
		position: relative;
		flex: none;
		width: 40px;
		height: 22px;
		border-radius: 999px;
		background: var(--bar-soft);
		transition: background 0.15s;
	}
	.track::after {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--bar-dim);
		transition: transform 0.15s;
	}
	[aria-checked='true'] .track {
		background: var(--accent);
	}
	[aria-checked='true'] .track::after {
		transform: translateX(18px);
		background: #fff;
	}
</style>
