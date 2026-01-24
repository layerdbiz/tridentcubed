<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import {
		hierarchy as d3Hierarchy,
		stratify as d3Stratify,
		type HierarchyNode
	} from 'd3-hierarchy';
	import { curveBumpY } from 'd3-shape';

	import { Chart, Group, Link, Layer, Rect, Text, Tree } from 'layerchart';
	import Controls from '../controls.svelte';

	// Type definitions for LayerChart connector utilities
	type ConnectorSweep = 'none' | 'ccw';
	type ConnectorType = 'straight' | 'square' | 'beveled' | 'rounded' | 'd3';

	export type TreeConfig = {
		orientation: 'horizontal' | 'vertical';
		layout: 'chart' | 'node';
		type: ConnectorType;
		sweep: ConnectorSweep;
		curve: any;
		radius: number;
	};

	// Local cls utility function for conditional classes
	function cls(...classes: (string | boolean | undefined | null)[]): string {
		return classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ');
	}

	let { data, controls = false } = $props<{ data: any; controls?: boolean }>();

	let config = $state<TreeConfig>({
		orientation: 'vertical',
		layout: 'node',
		type: 'd3',
		sweep: 'none',
		curve: curveBumpY,
		radius: 60
	});

	// Check if data is flat (array with id/parent) or hierarchical (object with children)
	const isFlat = Array.isArray(data);

	// Initialize with all nodes expanded
	let expandedNodeNames = $state(
		isFlat
			? data.map((d: any) => d.id || d.name) // All flat data nodes
			: getAllNodeNames(data.flare) // All nested data nodes
	);

	// Helper function to get all node names from nested structure
	function getAllNodeNames(node: any): string[] {
		const names = [node.name];
		if (node.children) {
			node.children.forEach((child: any) => {
				names.push(...getAllNodeNames(child));
			});
		}
		return names;
	}

	const hierarchy = $derived.by(() => {
		if (isFlat) {
			// Use stratify for flat data structures
			const stratify = d3Stratify()
				.id((d: any) => d.id)
				.parentId((d: any) => d.parent);

			// Create the hierarchy from flat data
			const root = stratify(data);

			// Apply expanded node filtering by modifying the hierarchy
			// We need to recursively hide children of collapsed nodes
			const applyExpanded = (node: any) => {
				if (node.children) {
					// Filter children based on whether this node is expanded
					if (expandedNodeNames.includes(node.data.id)) {
						// Node is expanded, recursively process children
						node.children.forEach(applyExpanded);
					} else {
						// Node is collapsed, hide children
						node._children = node.children;
						node.children = undefined;
					}
				}
			};

			applyExpanded(root);
			return root;
		} else {
			// Use hierarchy for nested data structures
			return d3Hierarchy(data.flare, (d: any) =>
				expandedNodeNames.includes(d.name) ? d.children : null
			);
		}
	});

	// .sum((d) => d.value)
	// .sort(sortFunc('value', 'desc'));
	let selected = $state();

	function getNodeKey(node: HierarchyNode<any>) {
		// Use id for flat data, name for nested data
		const identifier = node.data.id || node.data.name;
		return identifier + node.depth;
	}

	// Check if data has images (src field)
	const hasImages = $derived(isFlat ? data[0]?.src : false);

	const nodeWidth = $derived(hasImages ? 80 : 120);
	const nodeHeight = $derived(hasImages ? 100 : 20);
	const nodeSiblingGap = $derived(hasImages ? 40 : 20);
	const nodeParentGap = $derived(hasImages ? 120 : 100);
	const nodeSize = $derived(
		config.orientation === 'horizontal'
			? ([nodeHeight + nodeSiblingGap, nodeWidth + nodeParentGap] as [number, number])
			: ([nodeWidth + nodeSiblingGap, nodeHeight + nodeParentGap] as [number, number])
	);
</script>

<div class="pointer-events-auto relative h-full">
	{#if controls}
		<Controls bind:config />
	{/if}

	<Chart
		padding={{ top: 40, bottom: 40, left: 40, right: 40 }}
		transform={{
			mode: 'canvas',
			initialScrollMode: 'scale',
			initialScale: 0.75,
			initialTranslate:
				config.orientation === 'vertical'
					? { x: 0, y: 0 } // Will be calculated from context
					: undefined,
			motion: { type: 'tween', duration: 800, easing: cubicOut }
		}}
	>
		{#snippet children({ context })}
			<!-- Calculate center position for vertical orientation -->
			{@const centerX = config.orientation === 'vertical' ? context.width / 2 - nodeWidth / 2 : 0}

			<!-- Zoom Controls -->
			<div
				class="bg-surface-100/90 absolute right-4 top-4 z-10 flex gap-2 rounded-full p-1 backdrop-blur"
			>
				<button
					onclick={() => context.transform.zoomIn()}
					class="hover:bg-surface-200 rounded-full p-2 transition-colors"
					title="Zoom In"
					type="button"
				>
					<svg
						class="h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
						/>
					</svg>
				</button>
				<button
					onclick={() => context.transform.zoomOut()}
					class="hover:bg-surface-200 rounded-full p-2 transition-colors"
					title="Zoom Out"
					type="button"
				>
					<svg
						class="h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h6"
						/>
					</svg>
				</button>
				<button
					onclick={() => context.transform.reset()}
					class="hover:bg-surface-200 rounded-full p-2 transition-colors"
					title="Reset"
					type="button"
				>
					<svg
						class="h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
				</button>
			</div>

			<Tree
				{hierarchy}
				orientation={config.orientation}
				nodeSize={config.layout === 'node' ? nodeSize : undefined}
			>
				{#snippet children({ nodes, links })}
					<Layer type="svg">
						<!-- Wrap everything in a Group to center the entire tree for vertical orientation -->
						<Group
							x={centerX}
							y={0}
						>
							{#each links as link (getNodeKey(link.source) + '_' + getNodeKey(link.target))}
								<Link
									data={link}
									orientation={config.orientation}
									curve={config.curve}
									type={config.type}
									sweep={config.sweep as any}
									radius={config.radius}
									motion="tween"
									class="stroke-surface-content opacity-20"
								/>
							{/each}

							{#each nodes as node (getNodeKey(node))}
								<Group
									x={(config.orientation === 'horizontal' ? node.y : node.x) - nodeWidth / 2}
									y={(config.orientation === 'horizontal' ? node.x : node.y) - nodeHeight / 2}
									motion="tween"
									onclick={() => {
										// Use id for flat data, name for nested data
										const identifier = node.data.id || node.data.name;
										if (expandedNodeNames.includes(identifier)) {
											expandedNodeNames = expandedNodeNames.filter((id) => id !== identifier);
										} else {
											expandedNodeNames = [...expandedNodeNames, identifier];
										}
										selected = node; // transform.zoomTo({
										//   x: config.orientation === 'horizontal' ? selected.y : selected.x,
										//   y: config.orientation === 'horizontal' ? selected.x : selected.y,
										// });
									}}
									class={cls(node.data.children && 'cursor-pointer')}
								>
									{#if hasImages && node.data.src}
										<!-- Image with name underneath layout -->
										<foreignObject
											width={nodeWidth}
											height={nodeHeight}
										>
											<div class="flex h-full flex-col items-center justify-start gap-2">
												<img
													src={node.data.src}
													alt={node.data.name}
													class="size-12 rounded-full bg-white object-cover"
												/>
												<div
													class="text-primary w-full overflow-hidden text-ellipsis text-center text-[10px] leading-tight"
													style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;"
												>
													{node.data.name}
												</div>
											</div>
										</foreignObject>
									{:else}
										<!-- Default text-only layout -->
										<Rect
											width={nodeWidth}
											height={nodeHeight}
											class={cls(
												'fill-surface-100',
												node.data.children
													? 'stroke-primary hover:stroke-2'
													: 'stroke-secondary [stroke-dasharray:1]'
											)}
											rx={10}
										/>
										<Text
											value={node.data.name}
											x={nodeWidth / 2}
											y={nodeHeight / 2}
											dy={-2}
											textAnchor="middle"
											verticalAnchor="middle"
											class={cls(
												'pointer-events-none text-xs',
												node.data.children ? 'fill-primary' : 'fill-secondary'
											)}
										/>
									{/if}
								</Group>
							{/each}
						</Group>
					</Layer>
				{/snippet}
			</Tree>
		{/snippet}
	</Chart>
</div>
