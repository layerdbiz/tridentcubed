<!-- A row of choices (#342): the library's Button, one or several picked, the picked ones in the theme's primary. -->
<script
	lang="ts"
	generics="T extends string"
>
	import { Button } from '@layerd/ui';

	type ChoicesProps = {
		label: string;
		options: { value: T; label: string }[];
		picked: T[];
		onpick: (value: T) => void;
	};

	let { label, options, picked, onpick }: ChoicesProps = $props();
</script>

<div
	class="flex flex-wrap gap-1"
	role="group"
	aria-label={label}
>
	{#each options as option (option.value)}
		{@const isPicked = picked.includes(option.value)}
		<Button
			sm
			label={option.label}
			primary={isPicked}
			lite={!isPicked}
			aria-pressed={isPicked}
			onclick={() => onpick(option.value)}
		/>
	{/each}
</div>
