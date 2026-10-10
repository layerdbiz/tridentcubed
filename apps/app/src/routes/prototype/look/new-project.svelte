<script lang="ts">
	// PROTOTYPE (#161): New project is a popup (pages.md): title and client; the maker is the Owner.
	import type { LookState } from './look.state.svelte';

	let { look }: { look: LookState } = $props();
</script>

{#if look.isNewOpen}
	<div
		class="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/30 backdrop-blur-sm md:items-center"
		role="presentation"
		onclick={() => (look.isNewOpen = false)}
	>
		<div
			class="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl"
			role="dialog"
			aria-modal="true"
			aria-label="New project"
			tabindex="-1"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.key === 'Escape' && (look.isNewOpen = false)}
		>
			<div class="mb-5 flex items-center gap-3">
				<span
					class="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
					><span class="icon-[mdi--folder-plus-outline] size-6"></span></span
				>
				<div>
					<p class="text-lg font-semibold text-slate-900">New project</p>
					<p class="text-xs text-slate-500">You'll be the Owner. Add the rest inside.</p>
				</div>
			</div>
			<label class="mb-3 block">
				<span class="mb-1 block text-xs font-medium text-slate-500">Title</span>
				<input
					class="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary"
					placeholder="e.g. Steel coil discharge"
				/>
			</label>
			<label class="mb-6 block">
				<span class="mb-1 block text-xs font-medium text-slate-500">Client</span>
				<select
					class="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary"
				>
					<option>Northwind Shipping</option>
					<option>Bluewater Logistics</option>
					<option>+ Add a client</option>
				</select>
			</label>
			<div class="flex gap-2">
				<button
					class="flex-1 rounded-full border border-slate-200 py-2.5 font-medium text-slate-600"
					onclick={() => (look.isNewOpen = false)}>Cancel</button
				>
				<button
					class="flex-1 rounded-full bg-primary py-2.5 font-medium text-white"
					onclick={() => {
						look.isNewOpen = false;
						look.open('p4');
					}}>Create</button
				>
			</div>
		</div>
	</div>
{/if}
