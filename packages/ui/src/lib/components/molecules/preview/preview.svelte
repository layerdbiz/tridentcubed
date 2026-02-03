<script lang="ts">
	/**
	 * @tags ui
	 * @layout horizontal
	 */
	import { Component, type ComponentProps, Button } from '@layerd/ui';

	export interface PreviewProps extends ComponentProps {
		/** Snippet for the preview content (rendered output) */
		preview?: import('svelte').Snippet;
		/** Snippet for the code content */
		code?: import('svelte').Snippet;
		/** Initial view mode */
		defaultView?: 'preview' | 'code';
		/** Component reference with getHTML() method for automatic code generation */
		componentRef?: { getHTML?: () => string };
	}

	let {
		preview = undefined,
		code = undefined,
		defaultView = 'preview',
		componentRef = undefined,
		children = undefined,
		...props
	}: PreviewProps = $props();

	// Internal state for current view
	let currentView = $state<'preview' | 'code'>(defaultView);

	// Copy status state
	let copyStatus = $state<'idle' | 'copied'>('idle');
	let copiedLength = $state<number>(0);

	// Reference to the preview content element
	let previewContentElement: HTMLElement | undefined = $state();
	let iframeElement: HTMLIFrameElement | undefined = $state();

	// Get HTML from component reference if available - make it reactive
	const htmlCode = $derived.by(() => {
		if (componentRef && typeof componentRef.getHTML === 'function') {
			return componentRef.getHTML();
		}
		return '';
	}); // Update iframe content when htmlCode changes
	$effect(() => {
		if (iframeElement && htmlCode) {
			const iframeDoc = iframeElement.contentDocument || iframeElement.contentWindow?.document;

			if (iframeDoc) {
				iframeDoc.open();
				iframeDoc.write(`
					<!DOCTYPE html>
					<html>
					<head>
						<meta charset="UTF-8">
						<style>
							body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
						</style>
					</head>
					<body>
						${htmlCode}
					</body>
					</html>
				`);
				iframeDoc.close();

				// Auto-resize iframe to content height
				const resizeIframe = () => {
					if (iframeDoc.body && iframeElement) {
						// Use requestAnimationFrame to avoid layout thrashing
						requestAnimationFrame(() => {
							const contentHeight = Math.max(
								iframeDoc.body.scrollHeight,
								iframeDoc.documentElement.scrollHeight
							);
							if (iframeElement && contentHeight > 0) {
								iframeElement.style.height = `${contentHeight}px`;
							}
						});
					}
				};

				// Wait for all images and content to load
				const images = Array.from(iframeDoc.images);

				if (images.length > 0) {
					let loadedCount = 0;
					const totalImages = images.length;

					const onImageLoad = () => {
						loadedCount++;
						if (loadedCount >= totalImages) {
							// All images loaded
							resizeIframe();
						}
					};

					images.forEach((img) => {
						if (img.complete) {
							onImageLoad();
						} else {
							img.addEventListener('load', onImageLoad, { once: true });
							img.addEventListener('error', onImageLoad, { once: true });
						}
					});
				} else {
					// No images, resize after a short delay
					requestAnimationFrame(() => {
						setTimeout(resizeIframe, 50);
					});
				}
			}
		}
	});

	// Copy to clipboard handler
	async function handleCopy() {
		try {
			if (currentView === 'code' && htmlCode) {
				// Copy raw HTML code as text
				await navigator.clipboard.writeText(htmlCode);
				copiedLength = htmlCode.length;
			} else if (currentView === 'preview' && iframeElement) {
				// Copy from iframe - completely isolated from parent CSS
				const iframeDoc = iframeElement.contentDocument || iframeElement.contentWindow?.document;
				if (iframeDoc) {
					const signatureElement = iframeDoc.querySelector('.email-signature');
					const targetElement = signatureElement || iframeDoc.body;

					// Copy rendered content as rich HTML (for Gmail/Outlook)
					const range = iframeDoc.createRange();
					range.selectNodeContents(targetElement);
					const selection = iframeElement.contentWindow?.getSelection();
					if (selection) {
						selection.removeAllRanges();
						selection.addRange(range);
						iframeDoc.execCommand('copy');
						selection.removeAllRanges();
					}

					copiedLength = targetElement.innerHTML.length;
				}
			}

			// Show success feedback
			copyStatus = 'copied';
			setTimeout(() => {
				copyStatus = 'idle';
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<!-- Template 
::::::::::::::::::::::::::::::::::::::::::::: -->
<Component
	{...props}
	class={props.class}
>
	{#snippet component({ props: componentProps })}
		<div {...componentProps}>
			<!-- View Toggle Buttons -->
			<div class="preview-controls">
				<div class="preview-controls-left">
					<Button
						label="Preview"
						variant="text"
						align="center"
						size="sm"
						appearance={currentView === 'preview' ? 'heavy' : 'ghost'}
						onclick={() => (currentView = 'preview')}
					/>
					<Button
						label="Code"
						variant="text"
						align="center"
						appearance={currentView === 'code' ? 'heavy' : 'ghost'}
						size="sm"
						onclick={() => (currentView = 'code')}
					/>
				</div>
			</div>

			<!-- Content Display -->
			<div class="preview">
				<div
					class="preview-content relative {currentView === 'preview'
						? 'bg-white'
						: 'bg-neutral-900'}"
				>
					<div class="absolute right-2 top-2 flex gap-1">
						<!-- EDIT -->
						<Button
							variant="icon text"
							label="edit"
							icon="icon-[mdi--pencil-outline]"
							align="center"
							size="xxs"
							appearance="lite"
							color="base"
							class="min-w-18 uppercase"
							href="https://docs.google.com/spreadsheets/d/1Eauw3boJ1Gu6B78ywFuYB_bE3H1yHZyes0U0Mg9qRUs/edit?gid=0#gid=0"
							target="_blank"
							rel="noopener"
						/>

						<!-- COPY -->
						<Button
							variant="icon text"
							label={copyStatus === 'copied' ? 'copied' : 'copy'}
							icon={copyStatus === 'copied' ? 'icon-[mdi--check]' : 'icon-[mdi--content-copy]'}
							align="center"
							size="xxs"
							appearance={copyStatus === 'copied' ? 'heavy' : 'lite'}
							color={copyStatus === 'copied' ? 'accent' : 'base'}
							onclick={handleCopy}
							disabled={!htmlCode}
							class="uppercase {copyStatus === 'copied' ? 'pointer-events-none' : ''}"
						/>
					</div>
					{#if currentView === 'preview'}
						<!-- Iframe for isolated rendering (no parent CSS contamination) -->
						<iframe
							bind:this={iframeElement}
							class="preview-iframe"
							title="Email Signature Preview"
						></iframe>
					{:else if currentView === 'code'}
						{#if code}
							{@render code()}
						{:else if htmlCode}
							<pre><code>{htmlCode}</code></pre>
						{:else}
							<p class="text-neutral-500">
								No code available. Make sure to bind the component reference.
							</p>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	.preview {
		@apply border-neutral-200-600 rounded-lg border bg-white p-8;

		background-image: repeating-linear-gradient(
			45deg,
			var(--color-neutral-100-900),
			var(--color-neutral-100-900) 13px,
			var(--color-neutral-200-700) 13px,
			var(--color-neutral-200-700) 14px
		);

		background-size: 40px 40px;
	}

	.preview-controls {
		@apply mb-4 flex items-center justify-between gap-2;
	}

	.preview-controls-left {
		@apply flex gap-2;
	}

	.preview-content {
		@apply rounded p-4;

		/* Iframe styling */
		.preview-iframe {
			@apply w-full border-0 bg-white;
		}

		/* Code display styling */
		pre {
			@apply m-0 max-h-96 overflow-auto rounded p-4 text-sm;
			scrollbar-width: thin;
			scrollbar-color: transparent transparent;

			/* width */
			::-webkit-scrollbar {
				width: 4px;
				height: 4px;
			}

			/* Track */
			::-webkit-scrollbar-track {
				background: transparent;
			}

			/* Thumb */
			::-webkit-scrollbar-thumb {
				background: transparent;
			}

			code {
				@apply font-mono text-neutral-100;
			}
		}
	}
</style>
