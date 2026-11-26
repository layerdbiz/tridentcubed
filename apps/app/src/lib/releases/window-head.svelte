<script lang="ts">
	// The head of What's New and the new version window (#363, #396): the title, a quieter line under it, and a close
	// at the left, over a rule, as Discord's changelog has it.
	let { title, note, onclose }: { title: string; note: string; onclose: () => void } = $props();
</script>

<header
	class="relative -mx-5 flex shrink-0 flex-col items-center border-b border-slate-200 px-14 pb-3 text-center"
>
	<button
		type="button"
		class="absolute top-0 left-3 flex size-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
		aria-label="Close"
		onclick={onclose}
		><span
			class="icon-[mdi--close] size-6"
			aria-hidden="true"
		></span></button
	>
	<h2 class="text-xl font-bold text-slate-900">{title}</h2>
	{#if note}<p class="text-sm text-slate-500">{note}</p>{/if}
</header>
