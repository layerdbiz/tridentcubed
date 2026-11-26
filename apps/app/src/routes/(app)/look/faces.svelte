<script lang="ts">
	// PROTOTYPE (#161): a team's faces, owner first and on top; everyone else tucks in behind, in order. Each face has
	// its presence dot (Justin's note 9). Drawn by the library's stack (#379).
	import { Stack } from '@layerd/ui';
	import { faceOf } from './marks';

	// The report's cover shows them with no presence dots (#217): a printed page says nothing of who is online.
	let {
		names,
		size = 32,
		isMuted = false,
		max = 4,
		hasPresence = true
	}: {
		names: string[];
		size?: number;
		isMuted?: boolean;
		max?: number;
		hasPresence?: boolean;
	} = $props();

	const items = $derived(
		names.filter(Boolean).map((name, index) => ({
			...faceOf(name, { hasPresence }),
			id: name,
			title: index === 0 ? `${name} (team lead)` : name,
			ring:
				index === 0 ? 'ring-2 ring-primary ring-offset-2 ring-offset-white' : 'ring-2 ring-white',
			isMuted
		}))
	);
</script>

<Stack
	{items}
	{size}
	{max}
/>
