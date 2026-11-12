<script lang="ts">
	// PROTOTYPE (#161) run 33: the login page (Justin, 2026-11-12: "just a basic login page where it doesn't have
	// to actually work all the way yet ... a couple different prototypes"). It stands over the whole app until
	// someone signs in, and comes back on Log out. Nothing is checked: Sign In goes in whatever is typed, or with
	// both fields empty. Three looks (`login` in the selector): A a quiet centred card on the app's grey; B the
	// organization on a dark top with a white sheet rising under it, like the dashboard; C the form on glass over a
	// working photo.
	import type { LookState } from './look.state.svelte';

	let { look }: { look: LookState } = $props();

	const FIELD =
		'w-full rounded-xl border-0 bg-slate-900/[0.05] px-3.5 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary/40';
	const GLASS_FIELD =
		'w-full rounded-xl border-0 bg-white/15 px-3.5 py-3 text-base text-white outline-none transition placeholder:text-white/50 focus:bg-white/25 focus:ring-2 focus:ring-white/50';
	const LABEL = 'mb-1 block text-xs font-medium';

	const kind = $derived(look.variant('login'));
	const organization = $derived(look.organization);
	let email = $state('');
	let password = $state('');
</script>

{#snippet fields(field: string, label: string)}
	<label class="block">
		<span class="{LABEL} {label}">Email</span>
		<input
			class={field}
			type="email"
			autocomplete="username"
			placeholder="you@company.com"
			bind:value={email}
		/>
	</label>
	<label class="block">
		<span class="{LABEL} {label}">Password</span>
		<input
			class={field}
			type="password"
			autocomplete="current-password"
			placeholder="Password"
			bind:value={password}
		/>
	</label>
{/snippet}

{#snippet logo(size: string, tile: string)}
	{#if organization.logo}
		<span class="flex {size} items-center justify-center rounded-3xl {tile}"
			><img
				src={organization.logo}
				alt=""
				draggable="false"
				class="size-[72%] object-contain"
			/></span
		>
	{/if}
{/snippet}

<form
	class="look fixed inset-0 z-[250] overflow-y-auto font-sans [color-scheme:light]"
	onsubmit={(event) => {
		event.preventDefault();
		look.signIn();
	}}
>
	{#if kind === 'A'}
		<div class="flex min-h-full flex-col items-center justify-center bg-slate-100 px-5 py-10">
			<div class="w-full max-w-sm">
				<div class="flex flex-col items-center text-center">
					{@render logo('size-20', 'bg-white shadow-sm')}
					<h1 class="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Sign In</h1>
					<p class="mt-1 text-sm text-slate-500">{organization.name}</p>
				</div>
				<div
					class="mt-7 space-y-4 rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/0.05)]"
				>
					{@render fields(FIELD, 'text-slate-500')}
					<button class="w-full rounded-full bg-primary py-3 font-semibold text-base text-white"
						>Sign In</button
					>
				</div>
				<p class="mt-5 text-center text-sm text-slate-500">Forgot your password?</p>
			</div>
		</div>
	{:else if kind === 'B'}
		<div class="flex min-h-full flex-col bg-slate-950">
			<div
				class="flex flex-1 flex-col items-center justify-center bg-linear-to-br from-slate-700 to-slate-950 px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-16 text-center text-white"
			>
				{@render logo('size-24', 'bg-white')}
				<p class="mt-5 text-2xl font-semibold tracking-tight">{organization.name}</p>
				<p class="mt-1 text-sm text-white/60">Report Generator</p>
			</div>
			<div
				class="-mt-8 rounded-t-[40px] bg-white px-5 pt-7 pb-[calc(env(safe-area-inset-bottom)+2rem)] shadow-[0_-24px_70px_-8px_rgb(15_23_42/0.5)]"
			>
				<div class="mx-auto w-full max-w-sm space-y-4">
					<h1 class="text-xl font-semibold tracking-tight text-slate-900">Sign In</h1>
					{@render fields(FIELD, 'text-slate-500')}
					<button class="w-full rounded-full bg-primary py-3 font-semibold text-base text-white"
						>Sign In</button
					>
					<p class="text-center text-sm text-slate-500">Forgot your password?</p>
				</div>
			</div>
		</div>
	{:else}
		<div class="relative flex min-h-full flex-col items-center justify-center px-5 py-10">
			<img
				src="/services/cargo-surveys.webp"
				alt=""
				draggable="false"
				class="absolute inset-0 size-full object-cover"
			/>
			<div
				class="absolute inset-0 bg-linear-to-b from-slate-950/60 via-slate-950/70 to-slate-950/90"
			></div>
			<div class="relative w-full max-w-sm">
				<div class="flex flex-col items-center text-center text-white">
					{@render logo('size-20', 'bg-white')}
					<p class="mt-4 text-2xl font-semibold tracking-tight">{organization.name}</p>
				</div>
				<div
					class="mt-7 space-y-4 rounded-[28px] bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur-xl"
				>
					<h1 class="text-xl font-semibold tracking-tight text-white">Sign In</h1>
					{@render fields(GLASS_FIELD, 'text-white/70')}
					<button class="w-full rounded-full bg-white py-3 font-semibold text-base text-slate-900"
						>Sign In</button
					>
				</div>
				<p class="mt-5 text-center text-sm text-white/70">Forgot your password?</p>
			</div>
		</div>
	{/if}
</form>
