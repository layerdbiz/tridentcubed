<script lang="ts">
	// A video of a report, played in the app (#327; Justin, 2026-11-24): what a video's thumbnail opens, in the
	// downloaded PDF or on the Preview, since a PDF cannot play one. `/video/<file id>` sits behind sign-in like every
	// app address: a signed-out visitor signs in first and lands back here. The file itself is the app's address of
	// it (`/files/<id>`), which checks the member is of its organization.
	import { FILE_PREFIX } from '#lib/files/files.schema.js';

	let { id }: { id: string } = $props();

	const isId = $derived(/^[0-9a-f-]{36}$/i.test(id));
	let isFailed = $state(false);
</script>

<div class="fixed inset-0 flex flex-col bg-slate-950 font-sans text-white [color-scheme:dark]">
	<header
		class="flex shrink-0 items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3"
	>
		<a
			href="/"
			class="flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
			><img
				src="/branding/logo-dark.svg"
				alt=""
				class="size-7 object-contain"
			/>Trident Cubed</a
		>
	</header>
	<main
		class="flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(16px,env(safe-area-inset-bottom))]"
	>
		{#if isId && !isFailed}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				class="max-h-full w-full max-w-5xl rounded-xl bg-black"
				src="{FILE_PREFIX}{id}"
				controls
				autoplay
				playsinline
				onerror={() => (isFailed = true)}
			></video>
		{:else}
			<div class="max-w-sm text-center">
				<span class="icon-[mdi--video-off-outline] size-10 text-slate-400"></span>
				<p class="mt-3 text-lg font-semibold">This video cannot be played here.</p>
				<p class="mt-1 text-sm text-slate-400">
					It may have been deleted, or this browser cannot play its format. Open it on another
					device, or ask whoever added it.
				</p>
			</div>
		{/if}
	</main>
</div>
