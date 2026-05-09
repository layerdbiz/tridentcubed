<!-- Controls.svelte -->
<script>
	let {
		debugView = $bindable('split'),
		logMode = $bindable('hide'),
		modeViews = $bindable(['grid']),
		viewCols = $bindable('2'),
		placeModifier = $bindable(''),

		tag = $bindable(''),
		grid = $bindable(''),
		rail = $bindable(''),
		ratio = $bindable(''),
		size = $bindable(''),
		rows = $bindable(''),
		cols = $bindable(''),
		items = $bindable(''),
		content = $bindable(''),
		gap = $bindable(''),
		className = $bindable(''),

		componentProps = {},

		modeOptions = [],
		debugViewOptions = [],
		viewColOptions = [],
		placeModifierOptions = [],
		logOptions = [],
		gridOptions = [],
		tagOptions = [],
		railOptions = [],
		ratioOptions = [],
		gapOptions = [],
		sizeOptions = [],
		rowOptions = [],
		colOptions = [],
		itemPlacementOptions = [],
		contentPlacementOptions = [],
		classPresets = [],

		onReset = () => {}
	} = $props();

	function hasModeView(value) {
		return modeViews.includes(value);
	}

	function toggleModeView(value) {
		if (hasModeView(value) && modeViews.length === 1) return;

		const nextModes = hasModeView(value)
			? modeViews.filter((mode) => mode !== value)
			: [...modeViews, value];

		modeViews = modeOptions.filter((mode) => nextModes.includes(mode));
	}
</script>

<section class="demo-controls" aria-label="Demo controls">
	<div class="top-control-row">
		<div class="control-intro">
			<strong>Interactive Controls</strong>
			<span>Switch modes, debug views, placement, rails, and root props without leaving this route.</span>
		</div>

		<button class="reset-button" type="button" onclick={onReset}>Reset</button>
	</div>

	<div class="control-body">
		<div class="control-row">
			<section class="pill-group" aria-label="Mode views">
				<span>Modes</span>
				{#each modeOptions as option}
					<button type="button" class:active={hasModeView(option)} onclick={() => toggleModeView(option)}>{option}</button>
				{/each}
			</section>

			<section class="pill-group" aria-label="View columns">
				<span>Cols</span>
				{#each viewColOptions as option}
					<button type="button" class:active={viewCols === option} onclick={() => (viewCols = option)}>{option}</button>
				{/each}
			</section>

			<section class="pill-group" aria-label="Debug view">
				<span>Debug</span>
				{#each debugViewOptions as option}
					<button type="button" class:active={debugView === option} onclick={() => (debugView = option)}>{option}</button>
				{/each}
			</section>

			<section class="pill-group" aria-label="Log mode">
				<span>Logs</span>
				{#each logOptions as option}
					<button type="button" class:active={logMode === option} onclick={() => (logMode = option)}>{option}</button>
				{/each}
			</section>
		</div>

		<details class="prop-panel">
			<summary>
				Prop overrides
				<span>{Object.keys(componentProps).length ? `${Object.keys(componentProps).length} active` : 'default'}</span>
			</summary>

			<div class="prop-panel-body">
				<section class="prop-group">
					<div>1. Root</div>
					<div class="prop-matrix">
						<span class="prop-label">grid</span>
						<div class="prop-buttons">
							{#each gridOptions as option}
								<button type="button" class:active={grid === option} onclick={() => (grid = option)}>{option || 'default'}</button>
							{/each}
						</div>

						<span class="prop-label">rail</span>
						<div class="prop-buttons">
							{#each railOptions as option}
								<button type="button" class:active={rail === option.value} onclick={() => (rail = option.value)}>{option.label}</button>
							{/each}
						</div>

						<span class="prop-label">tag</span>
						<div class="prop-buttons">
							{#each tagOptions as option}
								<button type="button" class:active={tag === option} onclick={() => (tag = option)}>{option || 'default'}</button>
							{/each}
						</div>
					</div>
				</section>

				<section class="prop-group">
					<div>2. Ratio</div>
					<div class="prop-matrix">
						<span class="prop-label">preset</span>
						<div class="prop-buttons">
							{#each ratioOptions as option}
								<button type="button" class:active={ratio === option.value} onclick={() => (ratio = option.value)}>{option.label}</button>
							{/each}
						</div>

						<span class="prop-label">custom</span>
						<label class="ratio-field">
							<input type="text" placeholder="24:7, 24/7, 24 / 7" bind:value={ratio} />
						</label>
					</div>
				</section>

				<section class="prop-group">
					<div>3. Size</div>
					<div>
						{#each sizeOptions as option}
							<button type="button" class:active={size === option.value} onclick={() => (size = option.value)}>{option.label}</button>
						{/each}
					</div>
				</section>

				<section class="prop-group">
					<div>4. Box</div>
					<div class="prop-matrix">
						<span class="prop-label">gap</span>
						<div class="prop-buttons">
							{#each gapOptions as option}
								<button type="button" class:active={gap === option.value} onclick={() => (gap = option.value)}>{option.label}</button>
							{/each}
						</div>
					</div>
				</section>

				<section class="prop-group">
					<div>5. Tracks</div>
					<div class="prop-matrix">
						<span class="prop-label">cols</span>
						<div class="prop-buttons">
							{#each colOptions as option}
								<button type="button" class:active={cols === option.value} onclick={() => (cols = option.value)}>{option.label}</button>
							{/each}
						</div>

						<span class="prop-label">rows</span>
						<div class="prop-buttons">
							{#each rowOptions as option}
								<button type="button" class:active={rows === option.value} onclick={() => (rows = option.value)}>{option.label}</button>
							{/each}
						</div>
					</div>
				</section>

				<section class="prop-group">
					<div>6. Content</div>
					<div>
						{#each contentPlacementOptions as option}
							<button type="button" class:active={content === option.value} onclick={() => (content = option.value)}>{option.label}</button>
						{/each}
					</div>
				</section>

				<section class="prop-group">
					<div>7. Items</div>
					<div>
						{#each itemPlacementOptions as option}
							<button type="button" class:active={items === option.value} onclick={() => (items = option.value)}>{option.label}</button>
						{/each}
					</div>
				</section>

				<section class="prop-group">
					<div>8. Self</div>
					<div>
						{#each placeModifierOptions as option}
							<button type="button" class:active={placeModifier === option} onclick={() => (placeModifier = option)}>{option || 'none'}</button>
						{/each}
					</div>
				</section>

				<section class="prop-group">
					<div>9. Style</div>
					<div>
						{#each classPresets as option}
							<button type="button" class:active={className === option.value} onclick={() => (className = option.value)}>{option.label}</button>
						{/each}
					</div>
				</section>

				<label class="class-field">
					<span>class</span>
					<textarea bind:value={className}></textarea>
				</label>
			</div>
		</details>
	</div>
</section>

<style>
	.demo-controls {
		z-index: 100;
		display: grid;
		gap: 0.25rem;
		padding: 0.25rem;
		border-bottom: 1px solid #cbd5e1;
		background: rgb(255 255 255 / 0.96);
		backdrop-filter: blur(0.75rem);
		font-size: 0.75rem;
	}

	.top-control-row,
	.control-row {
		display: flex;
		gap: 0.25rem;
		align-items: center;
		overflow-x: auto;
		white-space: nowrap;
		scrollbar-width: none;
	}

	.top-control-row {
		justify-content: space-between;
		align-items: start;
	}

	.top-control-row::-webkit-scrollbar,
	.control-row::-webkit-scrollbar {
		display: none;
	}

	.control-intro,
	.pill-group {
		display: inline-flex;
		flex: 0 0 auto;
		gap: 0.25rem;
		align-items: center;
		border: 1px solid #cbd5e1;
		border-radius: 999rem;
		background: white;
		font-weight: 800;
	}

	.control-intro {
		flex-direction: column;
		align-items: start;
		padding: 0.45rem 0.65rem;
		white-space: normal;
	}

	.control-intro strong {
		color: #0f172a;
		font-size: 0.8rem;
	}

	.control-intro span {
		color: #475569;
		font-size: 0.72rem;
	}

	.pill-group button,
	.prop-group button,
	.reset-button {
		border: 0;
		cursor: pointer;
		font-weight: 800;
	}

	.control-body {
		display: grid;
		gap: 0.25rem;
	}

	.pill-group {
		padding: 0.25rem;
		font-size: 0.72rem;
	}

	.pill-group > span {
		padding-inline: 0.25rem;
	}

	.pill-group button,
	.prop-group button {
		border-radius: 999rem;
		background: #f1f5f9;
		color: #64748b;
		padding: 0.22rem 0.55rem;
	}

	.pill-group button.active,
	.prop-group button.active {
		background: #2563eb;
		color: white;
	}

	.prop-panel {
		border: 1px solid #cbd5e1;
		border-radius: 0.75rem;
		background: #f8fafc;
	}

	.prop-panel > summary {
		cursor: pointer;
		padding: 0.4rem 0.6rem;
		border-radius: 0.75rem;
		background: white;
		font-weight: 900;
		color: #1d4ed8;
	}

	.prop-panel > summary > span {
		margin-left: 0.4rem;
		border-radius: 999rem;
		background: #f1f5f9;
		color: #64748b;
		padding: 0.16rem 0.5rem;
	}

	.prop-panel-body {
		display: grid;
		max-height: 45dvh;
		gap: 0.4rem;
		overflow: auto;
		padding: 0.4rem;
	}

	.prop-group,
	.class-field {
		display: grid;
		gap: 0.25rem;
		padding: 0.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.65rem;
		background: white;
	}

	.prop-group > div:first-child,
	.class-field > span {
		font-weight: 900;
	}

	.prop-group > div:last-child {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.prop-matrix {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		gap: 0.35rem 0.5rem;
		align-items: start;
	}

	.prop-label {
		padding-block: 0.3rem;
		font-weight: 900;
		color: #475569;
	}

	.prop-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.ratio-field input,
	.class-field textarea {
		width: 100%;
		box-sizing: border-box;
		padding: 0.5rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		font-family: monospace;
		font-size: 0.8rem;
	}

	.class-field textarea {
		min-height: 4rem;
	}

	.reset-button {
		flex: 0 0 auto;
		border-radius: 999rem;
		background: #0f172a;
		color: white;
		padding: 0.55rem 0.8rem;
	}
</style>