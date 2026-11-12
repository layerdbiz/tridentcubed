<script lang="ts">
	// The login page: the look prototype's page B (#161, runs 33 to 35), the organization on a dark top ending in
	// the website's wave, with the white form rising under it. One change, forced by #115 and Justin's 2026-10-24
	// note ("one dynamic form, never two"): no Password field and no Create Account button. The form is an Email
	// field with one Continue, which sends a six-digit code, then the code entry; the first sign-in creates the user
	// (#181). Google and Microsoft show under it only when this deployment has their keys (#191). A deployment
	// missing a setting says it is not connected yet and names what is missing.
	import { page } from '$app/state';
	import { fetchSignInWays, submitCode, submitEmail } from './login.remote';

	const FIELD =
		'w-full rounded-xl border-0 bg-slate-900/[0.05] px-3.5 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary/40';
	const LABEL = 'mb-1 block text-xs font-medium text-slate-500';
	const PRIMARY =
		'w-full rounded-full bg-primary py-3 text-base font-semibold text-white transition disabled:opacity-60';
	const QUIET = 'text-sm font-semibold text-primary transition hover:underline disabled:opacity-60';
	const OTHER =
		'flex w-full items-center justify-center gap-2.5 rounded-full bg-slate-900/[0.05] py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-900/[0.08]';
	const OTHER_WAYS = [
		{ id: 'google', name: 'Google', icon: 'icon-[logos--google-icon]' },
		{ id: 'microsoft', name: 'Microsoft', icon: 'icon-[logos--microsoft-icon]' }
	] as const;

	const signIn = $derived(await fetchSignInWays());
	const others = $derived(OTHER_WAYS.filter((way) => signIn.ways.includes(way.id)));
	const next = $derived(page.url.searchParams.get('next') ?? '');

	// 'email' asks for the address; 'code' asks for the code that was sent to it. They start from the forms' last
	// results, so the page also works when a form was posted before the page's script ran.
	const sent = submitEmail.result?.ok ? submitEmail.result.email : '';
	let step = $state<'email' | 'code'>(sent ? 'code' : 'email');
	let email = $state(sent);
	let notice = $state(sent ? `We sent a 6-digit code to ${sent}.` : '');
	let problem = $state(submitCode.result?.message ?? '');
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

				{#if signIn.missing.length > 0}
					<div
						class="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
						role="status"
					>
						<p class="font-semibold">The app is not connected yet.</p>
						<p class="mt-1">This deployment still needs these settings:</p>
						<ul class="mt-1 list-disc pl-5">
							{#each signIn.missing as name (name)}<li><code>{name}</code></li>{/each}
						</ul>
					</div>
				{/if}

				{#if signIn.isConnected && signIn.ways.includes('email')}
					{#if step === 'code'}
						<form
							class="space-y-4"
							{...submitCode.enhance(async ({ submit }) => {
								problem = '';
								await submit();
								if (submitCode.result) problem = submitCode.result.message;
							})}
						>
							<p class="text-sm text-slate-600">
								{notice} It works for {signIn.codeMinutes} minutes.
							</p>
							<input {...submitCode.fields.email.as('hidden', email)} />
							<input {...submitCode.fields.next.as('hidden', next)} />
							<label class="block">
								<span class={LABEL}>Code</span>
								<!-- svelte-ignore a11y_autofocus -->
								<input
									class="{FIELD} tracking-[0.3em]"
									{...submitCode.fields.code.as('text')}
									inputmode="numeric"
									autocomplete="one-time-code"
									maxlength="7"
									placeholder="123456"
									autofocus
								/>
							</label>
							{#each submitCode.fields.code.issues() ?? [] as issue (issue.message)}
								<p class="text-sm text-rose-600">{issue.message}</p>
							{/each}
							{#if problem}<p
									class="text-sm text-rose-600"
									role="alert"
								>
									{problem}
								</p>{/if}
							<button
								class={PRIMARY}
								disabled={submitCode.pending > 0}>Continue</button
							>
						</form>
					{/if}

					<form
						class="space-y-4"
						{...submitEmail.enhance(async ({ submit }) => {
							problem = '';
							await submit();
							const result = submitEmail.result;
							if (!result) return;
							if (!result.ok) {
								problem = result.message;
								return;
							}
							notice = `${step === 'code' ? 'We sent a new code' : 'We sent a 6-digit code'} to ${result.email}.`;
							email = result.email;
							step = 'code';
						})}
					>
						{#if step === 'email'}
							<label class="block">
								<span class={LABEL}>Email</span>
								<!-- svelte-ignore a11y_autofocus -->
								<input
									class={FIELD}
									{...submitEmail.fields.email.as('email')}
									autocomplete="username"
									placeholder="you@company.com"
									autofocus
								/>
							</label>
							{#each submitEmail.fields.email.issues() ?? [] as issue (issue.message)}
								<p class="text-sm text-rose-600">{issue.message}</p>
							{/each}
							{#if problem}<p
									class="text-sm text-rose-600"
									role="alert"
								>
									{problem}
								</p>{/if}
							<button
								class={PRIMARY}
								disabled={submitEmail.pending > 0}>Continue</button
							>
						{:else}
							<input {...submitEmail.fields.email.as('hidden', email)} />
							<div class="flex items-center justify-between gap-3">
								<button
									class={QUIET}
									disabled={submitEmail.pending > 0}>Send a new code</button
								>
								<button
									type="button"
									class={QUIET}
									onclick={() => {
										step = 'email';
										problem = '';
									}}>Use a different email</button
								>
							</div>
						{/if}
					</form>
				{/if}

				{#if others.length > 0 && step === 'email'}
					<p class="flex items-center gap-3 text-xs text-slate-400">
						<span class="h-px flex-1 bg-slate-200"></span>or<span class="h-px flex-1 bg-slate-200"
						></span>
					</p>
					<div class="space-y-2">
						{#each others as way (way.id)}
							<button
								type="button"
								class={OTHER}
								><span class="{way.icon} size-5 shrink-0"></span>Continue with {way.name}</button
							>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
