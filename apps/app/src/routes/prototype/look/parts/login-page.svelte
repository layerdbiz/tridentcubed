<script lang="ts">
	// PROTOTYPE (#161) run 33: the login page (Justin, 2026-11-12: "just a basic login page where it doesn't have
	// to actually work all the way yet"). It stands over the whole app until someone signs in, and comes back on
	// Log out. Nothing is checked: every button goes in, whatever is typed, or with both fields empty.
	// Run 34: of the three looks he kept B, the organization on a dark top with a white sheet rising under it, like
	// the dashboard. The mark is the main website's own dark logo (packages/ui static/branding), with no tile
	// behind it. Under the fields are Sign In and Create Account, then the two usual other ways in, Google and
	// Microsoft. Run 35: the dark top ends in the website's own wave, in the white of the form under it (the same
	// path and heights as @layerd/ui's Divider, drawn here: importing that library into the prototype pulls in all of
	// its components' styles, which broke the panels' layout), the name is in capitals, and nothing is written under it.
	import type { LookState } from './look.state.svelte';

	let { look }: { look: LookState } = $props();

	const FIELD =
		'w-full rounded-xl border-0 bg-slate-900/[0.05] px-3.5 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary/40';
	const LABEL = 'mb-1 block text-xs font-medium text-slate-500';
	const OTHER =
		'flex w-full items-center justify-center gap-2.5 rounded-full bg-slate-900/[0.05] py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-900/[0.08]';
	const WAYS = [
		['Google', 'icon-[logos--google-icon]'],
		['Microsoft', 'icon-[logos--microsoft-icon]']
	];

	const organization = $derived(look.organization);
	let email = $state('');
	let password = $state('');
</script>

<form
	class="look fixed inset-0 z-[250] overflow-y-auto font-sans [color-scheme:light]"
	onsubmit={(event) => {
		event.preventDefault();
		look.signIn();
	}}
>
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
				<p class="mt-5 text-2xl font-semibold tracking-wide uppercase">{organization.name}</p>
			</div>
			<!-- The website's wave, as its sections end: the white of what comes next rising into the dark. -->
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
		<!-- Up one pixel over the wave, so no line of the dark shows between them. -->
		<div class="relative -mt-px bg-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
			<div class="mx-auto w-full max-w-sm space-y-4">
				<h1 class="text-xl font-semibold tracking-tight text-slate-900">Sign In</h1>
				<label class="block">
					<span class={LABEL}>Email</span>
					<input
						class={FIELD}
						type="email"
						autocomplete="username"
						placeholder="you@company.com"
						bind:value={email}
					/>
				</label>
				<label class="block">
					<span class={LABEL}>Password</span>
					<input
						class={FIELD}
						type="password"
						autocomplete="current-password"
						placeholder="Password"
						bind:value={password}
					/>
				</label>
				<div class="grid grid-cols-2 gap-2">
					<button class="rounded-full bg-primary py-3 font-semibold text-base text-white"
						>Sign In</button
					>
					<button
						type="button"
						class="rounded-full bg-slate-900 py-3 font-semibold text-base text-white"
						onclick={() => look.signIn()}>Create Account</button
					>
				</div>
				<p class="flex items-center gap-3 text-xs text-slate-400">
					<span class="h-px flex-1 bg-slate-200"></span>or<span class="h-px flex-1 bg-slate-200"
					></span>
				</p>
				<div class="space-y-2">
					{#each WAYS as [name, icon] (name)}
						<button
							type="button"
							class={OTHER}
							onclick={() => look.signIn()}
							><span class="{icon} size-5 shrink-0"></span>Sign in with {name}</button
						>
					{/each}
				</div>
			</div>
		</div>
	</div>
</form>
