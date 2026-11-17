<script lang="ts">
	// Waiting for access (#182): where a Guest (signed in, in no organization) is kept. Plain on purpose: their
	// email, what happens next, and Log out. It wears the login page's dark top and wave so it reads as the same door.
	// The server hook sends a Guest here from every other page, and a member away from it.
	import { signOut } from '#lib/auth/auth.remote.js';
	import { fetchWaiting } from './waiting.remote';

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
			<svg
				class="pointer-events-none block h-[60px] w-full fill-white lg:h-[120px]"
				viewBox="0 0 1200 120"
				preserveAspectRatio="none"
				aria-hidden="true"
				><path
					d="M1200,0v120H0C41,68.89,288.87-55.15,578.87,30.29c178.24,53.05,440.37,74.74,621.13-30.29Z"
				/></svg
			>
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
				<button
					type="button"
					class="w-full rounded-full bg-slate-900/[0.05] py-3 font-semibold text-base text-slate-800 transition hover:bg-slate-900/[0.08] disabled:opacity-60"
					disabled={isLeaving}
					onclick={logOut}>Log out</button
				>
			</div>
		</div>
	</div>
</div>
