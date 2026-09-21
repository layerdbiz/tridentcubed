
<!-- RailsDemos.svelte -->
<script>
	import Demo from './Demo.svelte';
	import Component from './Component.svelte';

	let {
		componentProps = {},
		modeViews = ['auto'],
		debugView = 'off',
		viewCols = '1',
		placeModifier = '',
		logMode = 'hide'
	} = $props();

	const railsComponentProps = $derived({
		...componentProps,
		grid: 'rails'
	});
</script>

<section class="rails-demos">
	<details class="demo-section" open>
		<summary class="demo-summary">Rails 0. Rail props</summary>

		<section class="demo-section-content">
			<Demo
				label="Rails 0a. content rails"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component rail="content-xs" class="demo" />
				<Component rail="content-sm" class="demo" />
				<Component rail="content" class="demo" />
				<Component rail="content-lg" class="demo" />
				<Component rail="content-xl" class="demo" />
			</Demo>

			<Demo
				label="Rails 0b. full and bleed rails"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component rail="full" class="demo" />
				<Component rail="bleed" class="demo" />
				<Component rail="popout" class="demo" />
			</Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Rails 1. Bleed ranges</summary>

		<section class="demo-section-content">
			<Demo
				label="Rails 1a. left bleed rails"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component rail="bleed-left" class="demo" />
				<Component rail="bleed-left-sm" class="demo" />
				<Component rail="bleed-left-lg" class="demo" />
			</Demo>

			<Demo
				label="Rails 1b. right bleed rails"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component rail="bleed-right" class="demo" />
				<Component rail="bleed-right-sm" class="demo" />
				<Component rail="bleed-right-lg" class="demo" />
			</Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Rails 2. Nested layout inside rails</summary>

		<section class="demo-section-content">
			<Demo
				label="Rails 2a. full rail with friendly layout"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component rail="full" class="demo rails-panel">
					<Component class="demo rails-nested" gap="0.5rem">
						{#snippet left()}{/snippet}
						{#snippet center()}{/snippet}
						{#snippet right()}{/snippet}
					</Component>
				</Component>
			</Demo>

			<Demo
				label="Rails 2b. content rail with friendly layout"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component rail="content" class="demo rails-panel">
					<Component class="demo rails-nested" gap="0.5rem">
						{#snippet left()}{/snippet}
						{#snippet center()}{/snippet}
						{#snippet right()}{/snippet}
					</Component>
				</Component>
			</Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Rails 3. Shell rows</summary>

		<section class="demo-section-content">
			<Demo
				label="Rails 3a. row1 row2 row3 shell"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				{#snippet row1()}
					<Component rail="full" class="demo rails-panel">
						<Component class="demo rails-nested" gap="0.5rem">
							{#snippet left()}{/snippet}
							{#snippet center()}{/snippet}
							{#snippet right()}{/snippet}
						</Component>
					</Component>
				{/snippet}

				{#snippet row2()}
					<Component rail="content" class="demo" />
					<Component rail="content-sm" class="demo" />
					<Component rail="popout" class="demo" />
					<Component rail="bleed-right" class="demo" />
					<Component rail="bleed" class="demo" />
				{/snippet}

				{#snippet row3()}
					<Component rail="content" class="demo" />
				{/snippet}
			</Demo>

			<Demo
				label="Rails 3b. row1 only"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				{#snippet row1()}
					<Component rail="full" class="demo rails-panel">
						<Component class="demo rails-nested" gap="0.5rem">
							{#snippet left()}{/snippet}
							{#snippet center()}{/snippet}
							{#snippet right()}{/snippet}
						</Component>
					</Component>
				{/snippet}
			</Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Rails 4. Class utilities</summary>

		<section class="demo-section-content">
			<Demo
				label="Rails 4a. plain class rails"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<section class="content-xs">content-xs</section>
				<section class="content-sm">content-sm</section>
				<section class="content">content</section>
				<section class="popout">popout</section>
				<section class="bleed">bleed</section>
			</Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Rails 5. Real-world combinations</summary>

		<section class="demo-section-content">
			<Demo
				label="Rails 5a. full bleed header with content nav"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component tag="header" grid="rails" rail="full" rails="content" class="rail-dark-header">
					<Component tag="nav" class="rail-dark-nav" gap="0.5rem">
						{#snippet left()}
							<strong>Logo</strong>
						{/snippet}

						{#snippet center()}
							<a href="#">Reports</a>
							<a href="#">Photos</a>
							<a href="#">Settings</a>
						{/snippet}

						{#snippet right()}
							<button type="button">Export</button>
						{/snippet}
					</Component>
				</Component>
			</Demo>

			<Demo
				label="Rails 5b. bleed hero with content-lg split"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component tag="section" grid="rails" rail="bleed" class="rail-hero">
					<Component rail="content-lg" class="rail-hero-content" gap="0.75rem">
						{#snippet left()}
							<section class="rail-copy">
								<h2>Full bleed section</h2>
								<p>Content stays aligned to the content-lg rail.</p>
							</section>
						{/snippet}

						{#snippet right()}
							<section class="rail-media-card">Media / preview</section>
						{/snippet}
					</Component>
				</Component>
			</Demo>

			<Demo
				label="Rails 5c. article flow with popout and bleed media"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component tag="section" rail="content" class="rail-plain-card">
					<h2>Report intro</h2>
					<p>Main copy defaults to the content rail.</p>
				</Component>

				<Component tag="aside" rail="popout" class="rail-callout">
					<strong>Popout note</strong>
					<p>Useful for summaries, warnings, or metadata.</p>
				</Component>

				<Component tag="figure" rail="bleed-right" class="rail-photo">
					<span>bleed-right media</span>
				</Component>

				<Component tag="section" rail="bleed" class="rail-band">
					full bleed band
				</Component>
			</Demo>

			<Demo
				label="Rails 5d. content card inside full bleed band"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component tag="section" grid="rails" rail="full" class="rail-soft-band">
					<Component tag="article" rail="content" class="rail-floating-card">
						<h2>Content card</h2>
						<p>The band spans full width, while this card sits on the content rail.</p>
					</Component>
				</Component>
			</Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Rails 6. Parent rails defaults</summary>

		<section class="demo-section-content">
			<Demo
				label="Rails 6a. full shell, children default to content"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component tag="section" grid="rails" rail="full" rails="content" class="rail-demo-band">
					<section class="rail-demo-token">
						<span>default child ’ content</span>
					</section>

					<section class="rail-demo-token">
						<span>default child ’ content</span>
					</section>

					<section class="rail-demo-token bleed">
						<span>explicit child ’ bleed</span>
					</section>
				</Component>
			</Demo>

			<Demo
				label="Rails 6b. full shell, children default to popout"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component tag="section" grid="rails" rail="full" rails="popout" class="rail-demo-band is-warm">
					<section class="rail-demo-token">
						<span>default child ’ popout</span>
					</section>

					<section class="rail-demo-token">
						<span>default child ’ popout</span>
					</section>

					<Component rail="content-sm" class="rail-demo-token">
						<span>explicit component ’ content-sm</span>
					</Component>
				</Component>
			</Demo>

			<Demo
				label="Rails 6c. full header, nav defaults to content"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component tag="header" grid="rails" rail="full" rails="content" class="rail-dark-header">
					<Component tag="nav" class="rail-dark-nav" gap="0.5rem">
						{#snippet left()}
							<strong>Logo</strong>
						{/snippet}

						{#snippet center()}
							<a href="#">Reports</a>
							<a href="#">Photos</a>
							<a href="#">Settings</a>
						{/snippet}

						{#snippet right()}
							<button type="button">Export</button>
						{/snippet}
					</Component>
				</Component>
			</Demo>

			<Demo
				label="Rails 6d. bleed hero, direct snippets default to content-lg"
				class="demo"
				gap="0.5rem"
				componentProps={railsComponentProps}
				{modeViews}
				{debugView}
				{viewCols}
				{placeModifier}
				inspect
				{logMode}
			>
				<Component tag="section" grid="rails" rail="bleed" rails="content-lg" class="rail-demo-hero" gap="0.75rem">
					{#snippet left()}
						<section class="rail-demo-copy">
							<h2>Bleed hero</h2>
							<p>The section bleeds full width, but direct snippets should live inside content-lg.</p>
						</section>
					{/snippet}

					{#snippet right()}
						<section class="rail-demo-media">Preview</section>
					{/snippet}
				</Component>
			</Demo>
		</section>
	</details>
</section>

<style>
	.rails-demos {
		display: grid;
		gap: 0.5rem;
	}

	.demo-section-content {
		display: grid;
		gap: 0.75rem;
		padding: 0.75rem;
	}

	:global {
		.demo.root-grid {
			min-height: 4rem;
			padding: 0.75rem;
			border: 1px solid #93c5fd;
			border-radius: 0.875rem;
			background: white;
			box-shadow: none;
		}

		.demo.root-grid > :where(:not(.root-grid):not(.is-debug):not(.slot-fallback)) {
			box-sizing: border-box;
			display: block;
			position: relative;
			min-width: 0;
			min-height: 0;
			padding: 0.65rem;
			border: 1px solid rgb(148 163 184 / 0.45);
			border-radius: 0.625rem;
			background: white;
			box-shadow: 0 0.25rem 0.75rem rgb(15 23 42 / 0.08);
			font-weight: 800;
			color: #0f172a;
		}

		.demo.root-grid > .is-cell:not(.is-debug) {
			border-color: #60a5fa;
			background: #eff6ff;
		}

		.demo.root-grid > .is-row:not(.is-debug) {
			border-color: #c084fc;
			background: #faf5ff;
		}

		.demo.root-grid > .is-col:not(.is-debug) {
			border-color: #a78bfa;
			background: #f5f3ff;
		}

		.demo.root-grid > .is-range:not(.is-debug) {
			border-color: #34d399;
			background: #ecfdf5;
		}

		.demo.root-grid > .is-half:not(.is-debug) {
			border-color: #fb923c;
			background: #fff7ed;
		}

		.demo.root-grid > .is-bg:not(.is-debug) {
			border-color: #38bdf8;
			background: rgb(186 230 253 / 0.65);
		}

		.demo.root-grid > .is-full:not(.is-debug) {
			border-color: #facc15;
			background: rgb(254 249 195 / 0.8);
		}

		.demo.root-grid > .is-fg:not(.is-debug) {
			border-color: #f472b6;
			background: rgb(252 231 243 / 0.88);
		}

		.demo.root-grid > .is-debug {
			position: relative;
			z-index: 0;
			pointer-events: none;
			overflow: visible;
			padding: 0;
			min-width: 0;
			min-height: 0;
			outline: 1px dashed #94a3b8;
			border: 0;
			background: rgb(148 163 184 / 0.14);
			box-shadow: none;
			color: #64748b;
		}

		.demo.root-grid > .is-debug .slot-fallback {
			display: inline-block;
			background: transparent;
			color: inherit;
			font: inherit;
			line-height: inherit;
			white-space: nowrap;
			pointer-events: none;
		}

		.demo.root-grid > :not(.is-debug) .slot-fallback,
		.demo.root-grid > .slot-fallback {
			display: inline-block;
			padding: 0.25rem 0.5rem;
			border-radius: 0.25rem;
			background: rgb(255 255 255 / 0.7);
			color: inherit;
			font-weight: 800;
		}

		.rails-panel.root-grid,
		.rails-nested.root-grid {
			min-height: 0;
		}

		.rail-dark-header.root-grid {
			padding-block: 1rem;
			background: #020617;
			color: white;
		}

		.rail-dark-nav.root-grid {
			align-items: center;
			min-height: 0;
			color: white;
		}

		.rail-dark-nav.root-grid > :where(.is-cell, .is-row, .is-col, .is-range) {
			align-content: center;
			min-height: 0;
			padding: 0.5rem;
		}

		.rail-dark-nav a {
			margin-inline-end: 1rem;
			color: #93c5fd;
			font-weight: 900;
			text-decoration: none;
		}

		.rail-dark-nav button {
			border: 0;
			border-radius: 999rem;
			background: white;
			color: #020617;
			padding: 0.55rem 0.9rem;
			font: inherit;
			font-weight: 900;
		}

		.rail-hero.root-grid {
			padding-block: 2rem;
			background: #1e3a8a;
			color: white;
		}

		.rail-hero-content.root-grid {
			min-height: 0;
		}

		.rail-hero-content.root-grid > :where(.is-cell, .is-row, .is-col, .is-range) {
			align-content: center;
			min-height: 0;
			padding: 1rem;
		}

		.rail-copy h2,
		.rail-copy p,
		.rail-floating-card h2,
		.rail-floating-card p,
		.rail-plain-card h2,
		.rail-plain-card p,
		.rail-callout p,
		.rail-demo-copy h2,
		.rail-demo-copy p {
			margin: 0;
		}

		.rail-copy {
			display: block;
		}

		.rail-copy h2,
		.rail-demo-copy h2 {
			margin-bottom: 0.4rem;
			font-size: 1.35rem;
		}

		.rail-copy p,
		.rail-demo-copy p {
			color: rgb(226 232 240 / 0.9);
		}

		.rail-media-card,
		.rail-demo-media {
			box-sizing: border-box;
			padding: 1.25rem;
			border: 1px solid rgb(255 255 255 / 0.25);
			border-radius: 0.9rem;
			background: rgb(255 255 255 / 0.12);
			font-weight: 900;
		}

		.rail-plain-card.root-grid,
		.rail-callout.root-grid,
		.rail-photo.root-grid,
		.rail-band.root-grid,
		.rail-soft-band.root-grid,
		.rail-floating-card.root-grid {
			min-height: 0;
			padding: 1rem;
		}

		.rail-plain-card.root-grid {
			border: 1px solid #cbd5e1;
			border-radius: 0.875rem;
			background: white;
		}

		.rail-plain-card h2 {
			margin-bottom: 0.35rem;
		}

		.rail-callout.root-grid {
			border: 1px solid #fde68a;
			border-radius: 0.875rem;
			background: #fffbeb;
		}

		.rail-callout strong {
			display: block;
			margin-bottom: 0.35rem;
		}

		.rail-photo.root-grid {
			border: 1px solid #67e8f9;
			border-radius: 0.875rem;
			background: #cffafe;
			font-weight: 900;
		}

		.rail-band.root-grid {
			background: #dcfce7;
			font-weight: 900;
		}

		.rail-soft-band.root-grid {
			padding-block: 2rem;
			background: #e2e8f0;
		}

		.rail-floating-card.root-grid {
			border: 1px solid #cbd5e1;
			border-radius: 1rem;
			background: white;
			box-shadow: 0 0.75rem 2rem rgb(15 23 42 / 0.14);
		}

		.rail-floating-card h2 {
			margin-bottom: 0.35rem;
		}

		.rail-demo-band.root-grid {
			min-height: 0;
			padding-block: 1.25rem;
			padding-inline: 1.25rem;
			background: #dbeafe;
		}

		.rail-demo-band.is-warm.root-grid {
			background: #ffedd5;
		}

		.rail-demo-token {
			box-sizing: border-box;
			min-height: 3rem;
			padding: 0.65rem;
			border: 1px solid #60a5fa;
			border-radius: 0.75rem;
			background: rgb(219 234 254 / 0.5);
			box-shadow: none;
			font-weight: 900;
		}

		.rail-demo-token > span {
			display: inline-block;
			padding: 0.45rem 0.7rem;
			border: 1px solid rgb(148 163 184 / 0.3);
			border-radius: 0.45rem;
			background: white;
			box-shadow: 0 0.25rem 0.75rem rgb(15 23 42 / 0.08);
		}

		.rail-demo-hero.root-grid {
			min-height: 0;
			padding-block: 2rem;
			padding-inline: 1.25rem;
			background: #1e3a8a;
			color: white;
		}

		.rail-demo-hero.root-grid > :where(.is-cell, .is-row, .is-col, .is-range) {
			align-content: center;
			min-height: 0;
			padding: 1rem;
		}
	}
</style>
