<script lang="ts">
	import { Component } from '$lib';

	const contentRails = ['content-xs', 'content-sm', 'content', 'content-lg', 'content-xl'] as const;
	const fullRails = ['full', 'bleed', 'popout'] as const;
	const leftBleeds = ['bleed-left', 'bleed-left-sm', 'bleed-left-lg'] as const;
	const rightBleeds = ['bleed-right', 'bleed-right-sm', 'bleed-right-lg'] as const;
	const classRails = ['content-xs', 'content-sm', 'content', 'popout', 'bleed'] as const;
</script>

<main class="play-demo-page">
	<header class="play-demo-header">
		<h1 class="play-demo-heading">Layout Snippets And Rails</h1>
		<p class="play-demo-intro">
			This page mirrors the merge demos directly in the route using only <code>Component</code>. Snippets come first, rails come next.
		</p>
	</header>

	<section class="play-demo-section">
		<div class="play-demo-section-copy">
			<h2 class="play-demo-section-heading">Snippets</h2>
			<p class="play-demo-section-text">These reproduce the merge snippet demos in grid mode with a normal view beside a debug view.</p>
		</div>

		<details class="play-demo-details" open>
			<summary class="play-demo-summary">Canonical Cells</summary>
			<div class="play-demo-details-body play-demo-grid">
				<article class="play-demo-card">
					<h3 class="play-demo-card-title">1. canonical cell a1</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet a1()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet a1()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">2. canonical cell b2</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet b2()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet b2()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">3. canonical cell c3</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet c3()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet c3()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">4. canonical diagonal a1 b2 c3</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet a1()}{/snippet}
								{#snippet b2()}{/snippet}
								{#snippet c3()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet a1()}{/snippet}
								{#snippet b2()}{/snippet}
								{#snippet c3()}{/snippet}
							</Component>
						</div>
					</div>
				</article>
			</div>
		</details>

		<details class="play-demo-details">
			<summary class="play-demo-summary">Friendly Cells</summary>
			<div class="play-demo-details-body play-demo-grid">
				<article class="play-demo-card">
					<h3 class="play-demo-card-title">5. friendly corner topLeft</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet topLeft()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet topLeft()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">6. friendly corner topRight</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet topRight()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet topRight()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">7. friendly corner bottomLeft</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet bottomLeft()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet bottomLeft()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">8. friendly corner bottomRight</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet bottomRight()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet bottomRight()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">9a. friendly position left center</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet left()}{/snippet}
								{#snippet center()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet left()}{/snippet}
								{#snippet center()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">9b. friendly position left center right</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet left()}{/snippet}
								{#snippet center()}{/snippet}
								{#snippet right()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet left()}{/snippet}
								{#snippet center()}{/snippet}
								{#snippet right()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">10a. friendly position top center</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet top()}{/snippet}
								{#snippet center()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet top()}{/snippet}
								{#snippet center()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">10b. friendly position top center bottom</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet top()}{/snippet}
								{#snippet center()}{/snippet}
								{#snippet bottom()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet top()}{/snippet}
								{#snippet center()}{/snippet}
								{#snippet bottom()}{/snippet}
							</Component>
						</div>
					</div>
				</article>
			</div>
		</details>

		<details class="play-demo-details">
			<summary class="play-demo-summary">Rows And Columns</summary>
			<div class="play-demo-details-body play-demo-grid">
				<article class="play-demo-card">
					<h3 class="play-demo-card-title">11a. friendly columns leftCol col</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet leftCol()}{/snippet}
								{#snippet col()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet leftCol()}{/snippet}
								{#snippet col()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">11b. friendly columns leftCol col rightCol</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet leftCol()}{/snippet}
								{#snippet col()}{/snippet}
								{#snippet rightCol()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet leftCol()}{/snippet}
								{#snippet col()}{/snippet}
								{#snippet rightCol()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">12. canonical columns col1 col2 col3</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet col1()}{/snippet}
								{#snippet col2()}{/snippet}
								{#snippet col3()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet col1()}{/snippet}
								{#snippet col2()}{/snippet}
								{#snippet col3()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">13. friendly rows topRow row bottomRow</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet topRow()}{/snippet}
								{#snippet row()}{/snippet}
								{#snippet bottomRow()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet topRow()}{/snippet}
								{#snippet row()}{/snippet}
								{#snippet bottomRow()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">14. canonical rows row1 row2 row3</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet row1()}{/snippet}
								{#snippet row2()}{/snippet}
								{#snippet row3()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet row1()}{/snippet}
								{#snippet row2()}{/snippet}
								{#snippet row3()}{/snippet}
							</Component>
						</div>
					</div>
				</article>
			</div>
		</details>

		<details class="play-demo-details">
			<summary class="play-demo-summary">Ranges</summary>
			<div class="play-demo-details-body play-demo-grid">
				<article class="play-demo-card">
					<h3 class="play-demo-card-title">15. cells matching range a1 b1 a2 b2</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet a1()}{/snippet}
								{#snippet b1()}{/snippet}
								{#snippet a2()}{/snippet}
								{#snippet b2()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet a1()}{/snippet}
								{#snippet b1()}{/snippet}
								{#snippet a2()}{/snippet}
								{#snippet b2()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">16. range a1b2</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet a1b2()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet a1b2()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">17. range b2c3</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet b2c3()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet b2c3()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">18. range a1c1</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet a1c1()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet a1c1()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">19. range c1c3</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet c1c3()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet c1c3()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">20. range a1c3</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet a1c3()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet a1c3()}{/snippet}
							</Component>
						</div>
					</div>
				</article>
			</div>
		</details>

		<details class="play-demo-details">
			<summary class="play-demo-summary">Halves</summary>
			<div class="play-demo-details-body play-demo-grid">
				<article class="play-demo-card">
					<h3 class="play-demo-card-title">21. half topHalf</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet topHalf()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet topHalf()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">22. half bottomHalf</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet bottomHalf()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet bottomHalf()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">23. half leftHalf</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet leftHalf()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet leftHalf()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">24. half rightHalf</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet rightHalf()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet rightHalf()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">25. halves topHalf bottomHalf</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet topHalf()}{/snippet}
								{#snippet bottomHalf()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet topHalf()}{/snippet}
								{#snippet bottomHalf()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">26. halves leftHalf rightHalf</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet leftHalf()}{/snippet}
								{#snippet rightHalf()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet leftHalf()}{/snippet}
								{#snippet rightHalf()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">27. halves all four</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet topHalf()}{/snippet}
								{#snippet bottomHalf()}{/snippet}
								{#snippet leftHalf()}{/snippet}
								{#snippet rightHalf()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet topHalf()}{/snippet}
								{#snippet bottomHalf()}{/snippet}
								{#snippet leftHalf()}{/snippet}
								{#snippet rightHalf()}{/snippet}
							</Component>
						</div>
					</div>
				</article>
			</div>
		</details>

		<details class="play-demo-details">
			<summary class="play-demo-summary">Layers</summary>
			<div class="play-demo-details-body play-demo-grid">
				<article class="play-demo-card">
					<h3 class="play-demo-card-title">28. bg only</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet bg()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet bg()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">29. full only</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet full()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet full()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">30. fg only</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet fg()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet fg()}{/snippet}
							</Component>
						</div>
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">31. bg + full + center + fg</h3>
					<div class="play-demo-compare">
						<div class="play-demo-state">
							<span class="play-demo-state-label">normal</span>
							<Component class="play-demo-root" mode="grid" gap="0.5rem">
								{#snippet bg()}{/snippet}
								{#snippet full()}{/snippet}
								{#snippet center()}{/snippet}
								{#snippet fg()}{/snippet}
							</Component>
						</div>

						<div class="play-demo-state">
							<span class="play-demo-state-label">debug</span>
							<Component class="play-demo-root" debug mode="grid" gap="0.5rem">
								{#snippet bg()}{/snippet}
								{#snippet full()}{/snippet}
								{#snippet center()}{/snippet}
								{#snippet fg()}{/snippet}
							</Component>
						</div>
					</div>
				</article>
			</div>
		</details>
	</section>

	<section class="play-demo-section">
		<div class="play-demo-section-copy">
			<h2 class="play-demo-section-heading">Rails</h2>
			<p class="play-demo-section-text">These reproduce the merge rails demos using only nested <code>Component</code> instances in the route.</p>
		</div>

		<details class="play-demo-details" open>
			<summary class="play-demo-summary">Rails 0. Rail Props</summary>
			<div class="play-demo-details-body play-demo-grid">
				<article class="play-demo-card">
					<h3 class="play-demo-card-title">0a. content rails</h3>
					<Component class="play-demo-root" grid="rails" gap="0.5rem">
						{#each contentRails as railName (railName)}
							<Component class="play-demo-child" rail={railName} />
						{/each}
					</Component>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">0b. full and bleed rails</h3>
					<Component class="play-demo-root" grid="rails" gap="0.5rem">
						{#each fullRails as railName (railName)}
							<Component class="play-demo-child" rail={railName} />
						{/each}
					</Component>
				</article>
			</div>
		</details>

		<details class="play-demo-details">
			<summary class="play-demo-summary">Rails 1. Bleed Ranges</summary>
			<div class="play-demo-details-body play-demo-grid">
				<article class="play-demo-card">
					<h3 class="play-demo-card-title">1a. left bleed rails</h3>
					<Component class="play-demo-root" grid="rails" gap="0.5rem">
						{#each leftBleeds as railName (railName)}
							<Component class="play-demo-child" rail={railName} />
						{/each}
					</Component>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">1b. right bleed rails</h3>
					<Component class="play-demo-root" grid="rails" gap="0.5rem">
						{#each rightBleeds as railName (railName)}
							<Component class="play-demo-child" rail={railName} />
						{/each}
					</Component>
				</article>
			</div>
		</details>

		<details class="play-demo-details">
			<summary class="play-demo-summary">Rails 2. Nested Layout Inside Rails</summary>
			<div class="play-demo-details-body play-demo-grid">
				<article class="play-demo-card">
					<h3 class="play-demo-card-title">2a. full rail with friendly layout</h3>
					<Component class="play-demo-root" grid="rails" gap="0.5rem">
						<Component class="play-demo-child" rail="full">
							<Component class="play-demo-root play-demo-surface-nested" gap="0.5rem">
								{#snippet left()}{/snippet}
								{#snippet center()}{/snippet}
								{#snippet right()}{/snippet}
							</Component>
						</Component>
					</Component>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">2b. content rail with friendly layout</h3>
					<Component class="play-demo-root" grid="rails" gap="0.5rem">
						<Component class="play-demo-child" rail="content">
							<Component class="play-demo-root play-demo-surface-nested" gap="0.5rem">
								{#snippet left()}{/snippet}
								{#snippet center()}{/snippet}
								{#snippet right()}{/snippet}
							</Component>
						</Component>
					</Component>
				</article>
			</div>
		</details>

		<details class="play-demo-details">
			<summary class="play-demo-summary">Rails 3. Shell Rows</summary>
			<div class="play-demo-details-body play-demo-grid">
				<article class="play-demo-card">
					<h3 class="play-demo-card-title">3a. row1 row2 row3 shell</h3>
					<Component class="play-demo-root" grid="rails" gap="0.5rem">
						{#snippet row1()}
							<Component class="play-demo-child" rail="full">
								<Component class="play-demo-root play-demo-surface-nested" gap="0.5rem">
									{#snippet left()}{/snippet}
									{#snippet center()}{/snippet}
									{#snippet right()}{/snippet}
								</Component>
							</Component>
						{/snippet}
						{#snippet row2()}
							<Component class="play-demo-child" rail="content" />
							<Component class="play-demo-child" rail="content-sm" />
							<Component class="play-demo-child" rail="popout" />
							<Component class="play-demo-child" rail="bleed-right" />
							<Component class="play-demo-child" rail="bleed" />
						{/snippet}
						{#snippet row3()}
							<Component class="play-demo-child" rail="content" />
						{/snippet}
					</Component>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">3b. row1 only</h3>
					<Component class="play-demo-root" grid="rails" gap="0.5rem">
						{#snippet row1()}
							<Component class="play-demo-child" rail="full">
								<Component class="play-demo-root play-demo-surface-nested" gap="0.5rem">
									{#snippet left()}{/snippet}
									{#snippet center()}{/snippet}
									{#snippet right()}{/snippet}
								</Component>
							</Component>
						{/snippet}
					</Component>
				</article>
			</div>
		</details>

		<details class="play-demo-details">
			<summary class="play-demo-summary">Rails 4. Class Utilities</summary>
			<div class="play-demo-details-body play-demo-grid">
				<article class="play-demo-card">
					<h3 class="play-demo-card-title">4a. plain class rails</h3>
					<Component class="play-demo-root" grid="rails" gap="0.5rem">
						{#each classRails as railClass (railClass)}
							<Component class={`play-demo-child ${railClass}`} tag="section" />
						{/each}
					</Component>
				</article>
			</div>
		</details>

		<details class="play-demo-details">
			<summary class="play-demo-summary">Rails 5. Real-World Combinations</summary>
			<div class="play-demo-details-body play-demo-grid">
				<article class="play-demo-card">
					<h3 class="play-demo-card-title">5a. full bleed header with content nav</h3>
					<Component
						class="play-demo-root play-demo-surface-header-dark"
						tag="header"
						grid="rails"
						rail="full"
						rails="content"
					>
						<Component class="play-demo-root play-demo-surface-nav-dark" tag="nav" gap="0.5rem">
							{#snippet left()}{/snippet}
							{#snippet center()}{/snippet}
							{#snippet right()}{/snippet}
						</Component>
					</Component>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">5b. bleed hero with content-lg split</h3>
					<Component class="play-demo-root play-demo-surface-hero" tag="section" grid="rails" rail="bleed">
						<Component class="play-demo-root play-demo-surface-nested" rail="content-lg" gap="0.75rem">
							{#snippet left()}{/snippet}
							{#snippet right()}{/snippet}
						</Component>
					</Component>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">5c. article flow with popout and bleed media</h3>
					<div class="play-demo-stack">
						<Component class="play-demo-root play-demo-surface-card" tag="section" grid="rails" rail="content" />
						<Component class="play-demo-root play-demo-surface-callout" tag="aside" grid="rails" rail="popout" />
						<Component class="play-demo-root play-demo-surface-photo" tag="figure" grid="rails" rail="bleed-right" />
						<Component class="play-demo-root play-demo-surface-band" tag="section" grid="rails" rail="bleed" />
					</div>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">5d. content card inside full bleed band</h3>
					<Component class="play-demo-root play-demo-surface-soft-band" tag="section" grid="rails" rail="full">
						<Component class="play-demo-root play-demo-surface-card" tag="article" rail="content" />
					</Component>
				</article>
			</div>
		</details>

		<details class="play-demo-details">
			<summary class="play-demo-summary">Rails 6. Parent Rails Defaults</summary>
			<div class="play-demo-details-body play-demo-grid">
				<article class="play-demo-card">
					<h3 class="play-demo-card-title">6a. full shell, children default to content</h3>
					<Component class="play-demo-root play-demo-surface-band" tag="section" grid="rails" rail="full" rails="content">
						<Component class="play-demo-band-child" tag="section" />
						<Component class="play-demo-band-child" tag="section" />
						<Component class="play-demo-band-child" tag="section" rail="bleed" />
					</Component>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">6b. full shell, children default to popout</h3>
					<Component class="play-demo-root play-demo-surface-soft-band" tag="section" grid="rails" rail="full" rails="popout">
						<Component class="play-demo-band-child-warm" tag="section" />
						<Component class="play-demo-band-child-warm" tag="section" />
						<Component class="play-demo-band-child-warm" rail="content-sm" />
					</Component>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">6c. full header, nav defaults to content</h3>
					<Component class="play-demo-root play-demo-surface-header-dark" tag="header" grid="rails" rail="full" rails="content">
						<Component class="play-demo-root play-demo-surface-nav-dark" tag="nav" gap="0.5rem">
							{#snippet left()}{/snippet}
							{#snippet center()}{/snippet}
							{#snippet right()}{/snippet}
						</Component>
					</Component>
				</article>

				<article class="play-demo-card">
					<h3 class="play-demo-card-title">6d. bleed hero, direct snippets default to content-lg</h3>
					<Component
						class="play-demo-root play-demo-surface-hero"
						tag="section"
						grid="rails"
						rail="bleed"
						rails="content-lg"
						gap="0.75rem"
					>
						{#snippet left()}{/snippet}
						{#snippet right()}{/snippet}
					</Component>
				</article>
			</div>
		</details>
	</section>
</main>

<style lang="postcss">
	@reference "#app.css";

	.play-demo-page {
		@apply p-6 md:p-8;
	}

	.play-demo-page > * + * {
		@apply mt-8;
	}

	.play-demo-heading {
		@apply text-3xl font-semibold tracking-tight text-black;
	}

	.play-demo-intro {
		@apply max-w-3xl text-sm leading-6 text-black/65;
	}

	.play-demo-section {
		@apply rounded-3xl bg-white p-5 outline outline-black/10;
	}

	.play-demo-section > * + * {
		@apply mt-4;
	}

	.play-demo-section-heading {
		@apply text-xl font-semibold text-black;
	}

	.play-demo-section-text {
		@apply text-sm leading-6 text-black/60;
	}

	.play-demo-details {
		@apply overflow-hidden rounded-2xl bg-stone-50 outline outline-black/10;
	}

	.play-demo-details + .play-demo-details {
		@apply mt-4;
	}

	.play-demo-summary {
		@apply cursor-pointer list-none bg-white px-4 py-3 text-sm font-semibold text-black;
	}

	.play-demo-details-body {
		@apply p-4;
	}

	.play-demo-details-body > * + * {
		@apply mt-3;
	}

	.play-demo-card {
		@apply rounded-2xl bg-white p-4 outline outline-black/10;
	}

	.play-demo-card > * + * {
		@apply mt-3;
	}

	.play-demo-card-title {
		@apply text-sm font-semibold text-black;
	}

	.play-demo-compare > * + * {
		@apply mt-3;
	}

	.play-demo-state-label {
		@apply mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-black/45;
	}

	.play-demo-stack {
		@apply space-y-2;
	}

	.play-demo-page :global(.play-demo-root),
	.play-demo-page :global(.play-demo-child),
	.play-demo-page :global(.play-demo-band-child),
	.play-demo-page :global(.play-demo-band-child-warm),
	.play-demo-page :global(.play-demo-surface-card),
	.play-demo-page :global(.play-demo-surface-callout),
	.play-demo-page :global(.play-demo-surface-photo),
	.play-demo-page :global(.play-demo-surface-band),
	.play-demo-page :global(.play-demo-surface-soft-band),
	.play-demo-page :global(.play-demo-surface-header-dark),
	.play-demo-page :global(.play-demo-surface-nav-dark),
	.play-demo-page :global(.play-demo-surface-hero),
	.play-demo-page :global(.play-demo-surface-nested) {
		@apply rounded-xl p-3;
	}

	.play-demo-page :global(.play-demo-root),
	.play-demo-page :global(.play-demo-child) {
		@apply bg-white/80 outline outline-slate-300;
	}

	.play-demo-page :global(.play-demo-root) {
		@apply bg-slate-50/70 p-4;
	}

	.play-demo-page :global(.play-demo-band-child) {
		@apply bg-sky-100/60 outline outline-sky-300;
	}

	.play-demo-page :global(.play-demo-band-child-warm) {
		@apply bg-orange-100/60 outline outline-orange-300;
	}

	.play-demo-page :global(.play-demo-surface-card) {
		@apply bg-white outline outline-slate-300;
	}

	.play-demo-page :global(.play-demo-surface-callout) {
		@apply bg-amber-50 outline outline-amber-300;
	}

	.play-demo-page :global(.play-demo-surface-photo) {
		@apply bg-cyan-100/80 outline outline-cyan-300;
	}

	.play-demo-page :global(.play-demo-surface-band) {
		@apply bg-emerald-100;
	}

	.play-demo-page :global(.play-demo-surface-soft-band) {
		@apply bg-slate-200 p-5;
	}

	.play-demo-page :global(.play-demo-surface-header-dark),
	.play-demo-page :global(.play-demo-surface-nav-dark) {
		@apply bg-slate-950 text-white;
	}

	.play-demo-page :global(.play-demo-surface-hero) {
		@apply bg-blue-900 text-white;
	}

	.play-demo-page :global(.play-demo-root > *){
		@apply rounded-lg p-3 outline outline-black/15;
	}

	.play-demo-page :global(.play-demo-root > .slot-fallback) {
		@apply bg-sky-100/60;
	}

	.play-demo-page :global(.play-demo-root > .is-snippet-zone) {
		@apply bg-transparent;
	}

	.play-demo-page :global(.play-demo-root > .is-cell),
	.play-demo-page :global(.play-demo-root > .is-snippet-zone > .is-cell) {
		@apply bg-sky-100/60;
	}

	.play-demo-page :global(.play-demo-root > .is-row),
	.play-demo-page :global(.play-demo-root > .is-col),
	.play-demo-page :global(.play-demo-root > .is-snippet-zone > .is-row),
	.play-demo-page :global(.play-demo-root > .is-snippet-zone > .is-col) {
		@apply bg-violet-100/60;
	}

	.play-demo-page :global(.play-demo-root > .is-range),
	.play-demo-page :global(.play-demo-root > .is-snippet-zone > .is-range) {
		@apply bg-emerald-100/60;
	}

	.play-demo-page :global(.play-demo-root > .is-half),
	.play-demo-page :global(.play-demo-root > .is-snippet-zone > .is-half) {
		@apply bg-amber-100/60;
	}

	.play-demo-page :global(.play-demo-root > .is-full),
	.play-demo-page :global(.play-demo-root > .is-snippet-zone > .is-full) {
		@apply bg-amber-200/60;
	}

	.play-demo-page :global(.play-demo-root > .is-bg),
	.play-demo-page :global(.play-demo-root > .is-snippet-zone > .is-bg) {
		@apply bg-blue-200/60;
	}

	.play-demo-page :global(.play-demo-root > .is-fg),
	.play-demo-page :global(.play-demo-root > .is-snippet-zone > .is-fg) {
		@apply bg-rose-200/60;
	}

	.play-demo-page :global(.play-demo-root > .is-rail-fallback) {
		@apply text-sky-950;
	}
</style>