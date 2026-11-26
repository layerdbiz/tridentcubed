<script lang="ts">
	// The way back (#386): the one back arrow at the top left of a project, a record and every page opened from the
	// dashboard, the library Button in the types picked on #384. On white it is black on no shape (`secondary
	// ghost`), over a photo or a dark map white (`ghost invert`, with the theme's shadow), and on a page whose top
	// buttons are glass a white glass circle (`glass`). `hasChevron` (Header C) draws a chevron, a size up on white
	// and dark, as its 28 px icon was; an arrow is md.
	import { Button } from '@layerd/ui';

	let {
		label,
		onclick,
		over = 'white',
		hasChevron = false,
		class: className = ''
	}: {
		label: string;
		onclick: () => void;
		// What it sits on.
		over?: 'white' | 'dark' | 'glass';
		hasChevron?: boolean;
		// Layout only: where it sits.
		class?: string;
	} = $props();
</script>

<Button
	secondary={over === 'white'}
	ghost={over !== 'glass'}
	invert={over === 'dark'}
	glass={over === 'glass'}
	size={hasChevron && over !== 'glass' ? 'lg' : 'md'}
	icon={hasChevron ? 'icon-[mdi--chevron-left]' : 'icon-[mdi--arrow-left]'}
	aria-label={label}
	title={label}
	class={className}
	{onclick}
/>
