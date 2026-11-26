<script lang="ts">
	// The Needs Internet screen (#201): what the app shows with no signal, in place of the phone's blank "cannot
	// connect" page. The service worker shows it at the address that was asked for, so Try Again and the browser's
	// "back online" signal are both a plain reload of that address. It wears the login page's dark top and wave so
	// it reads as the same app: tall on a phone, shorter on a desktop. Its script is plain, in the page's head,
	// because the page runs none of SvelteKit's (+page.ts). Everything it loads is kept on the device: the app's
	// styles and the logo.
	import { LOGO } from '#lib/install/install.constants.js';
	import { Button, Divider } from '@layerd/ui';
</script>

<svelte:head>
	<script>
		addEventListener('online', () => location.reload());
		addEventListener('click', (event) => {
			if (event.target instanceof Element && event.target.closest('[data-retry]'))
				location.reload();
		});
	</script>
</svelte:head>

<div class="fixed inset-0 overflow-y-auto font-sans [color-scheme:light]">
	<div class="flex min-h-full flex-col bg-slate-950">
		<div
			class="flex flex-1 flex-col bg-linear-to-br from-slate-700 to-slate-950 text-white md:flex-none"
		>
			<div
				class="flex flex-1 flex-col items-center justify-center px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-6 text-center md:pt-10 md:pb-4"
			>
				<img
					src={LOGO}
					alt=""
					draggable="false"
					class="size-28 object-contain md:size-32"
				/>
				<p class="mt-5 text-2xl font-semibold tracking-wide uppercase md:text-4xl">Trident Cubed</p>
			</div>
			<!-- The login page's wave: the white of what comes next rising into the dark. -->
			<Divider
				shape="waves"
				color="text-white"
				bleed={false}
			/>
		</div>
		<!-- Up one pixel over the wave, so no line of the dark shows between them. -->
		<div
			class="relative -mt-px bg-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+2rem)] md:flex-1 md:pt-10"
		>
			<div class="mx-auto w-full max-w-sm space-y-4">
				<h1 class="text-xl font-semibold tracking-tight text-slate-900">Needs Internet</h1>
				<p class="text-sm text-slate-600">
					Trident needs a connection for now. Working with no signal is coming.
				</p>
				<Button
					primary
					heavy
					md
					width="full"
					label="Try Again"
					data-retry
				/>
			</div>
		</div>
	</div>
</div>
