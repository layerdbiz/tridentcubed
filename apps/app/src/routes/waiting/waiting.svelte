<script lang="ts">
	// Waiting for access (#182): where a Guest (signed in, in no organization) is kept. Plain on purpose: their
	// email, what happens next, and Log Out. It wears the login page's dark top and wave so it reads as the same door.
	// The server hook sends a Guest here from every other page, and a member away from it.
	import { signOut } from '#lib/auth/auth.remote.js';
	import { fetchWaiting } from './waiting.remote';
	import { Button, Divider } from '@layerd/ui';

	const waiting = $derived(await fetchWaiting());
	let isLeaving = $state(false);

	async function logOut() {
		isLeaving = true;
		await signOut();
		location.assign('/login');
	}
</script>

<div class="fixed inset-0 overflow-y-auto font-sans [color-scheme:light]">
	<div class="flex min-h-full flex-col bg-slate-950">
		<div class="flex flex-1 flex-col bg-linear-to-br from-slate-700 to-slate-950 text-white">
			<div
				class="flex flex-1 flex-col items-center justify-center px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-6 text-center"
			>
				<img
					src="/branding/logo-dark.svg"
					alt=""
					draggable="false"
					class="size-28 object-contain"
				/>
				<p class="mt-5 text-2xl font-semibold tracking-wide uppercase">Trident Cubed</p>
			</div>
			<Divider
				shape="waves"
				color="text-white"
				bleed={false}
			/>
		</div>
		<div class="relative -mt-px bg-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
			<div class="mx-auto w-full max-w-sm space-y-4">
				<h1 class="text-xl font-semibold tracking-tight text-slate-900">Waiting for access</h1>
				<p class="text-sm text-slate-600">
					You are signed in as <span class="font-semibold text-slate-900">{waiting.email}</span>.
				</p>
				<p class="text-sm text-slate-600">
					This address is not part of an organization yet. An Admin can let you in; then sign in
					again.
				</p>
				<Button
					neutral
					lite
					md
					width="full"
					label="Log Out"
					disabled={isLeaving}
					onclick={logOut}
				/>
			</div>
		</div>
	</div>
</div>
