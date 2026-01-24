<script lang="ts">
	import { curveBumpX } from 'd3-shape';

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

	let { config = $bindable() } = $props<{ config: TreeConfig }>();

	const connectorTypes: ConnectorType[] = ['straight', 'square', 'beveled', 'rounded', 'd3'];
	const sweepOptions: ConnectorSweep[] = ['none', 'ccw'];

	function getCurveName(curve: any): string {
		if (curve === curveBumpX) return 'BumpX';
		return 'BumpX'; // default
	}

	function cyclePrev<T>(arr: T[], current: T): T {
		const idx = arr.indexOf(current);
		return arr[idx - 1] ?? arr[arr.length - 1];
	}

	function cycleNext<T>(arr: T[], current: T): T {
		const idx = arr.indexOf(current);
		return arr[idx + 1] ?? arr[0];
	}

	// Local cls utility function for conditional classes
	function cls(...classes: (string | boolean | undefined | null)[]): string {
		return classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ');
	}
</script>

<!-- Controls -->
<div class="absolute left-4 right-4 top-4 z-10 flex flex-wrap gap-4">
	<!-- Orientation -->
	<div class="min-w-[200px] flex-1">
		<div class="text-surface-content/60 mb-2 text-sm">Orientation</div>
		<div class="flex gap-2">
			<button
				onclick={() => (config.orientation = 'horizontal')}
				class={cls(
					'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
					config.orientation === 'horizontal'
						? 'bg-primary/20 text-primary border-primary border-2'
						: 'bg-surface-100 text-surface-content/60 hover:border-surface-content/20 border-2 border-transparent'
				)}
			>
				Horizontal
			</button>
			<button
				onclick={() => (config.orientation = 'vertical')}
				class={cls(
					'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
					config.orientation === 'vertical'
						? 'bg-primary/20 text-primary border-primary border-2'
						: 'bg-surface-100 text-surface-content/60 hover:border-surface-content/20 border-2 border-transparent'
				)}
			>
				Vertical
			</button>
		</div>
	</div>

	<!-- Layout -->
	<div class="min-w-[200px] flex-1">
		<div class="text-surface-content/60 mb-2 text-sm">Layout</div>
		<div class="flex gap-2">
			<button
				onclick={() => (config.layout = 'chart')}
				class={cls(
					'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
					config.layout === 'chart'
						? 'bg-primary/20 text-primary border-primary border-2'
						: 'bg-surface-100 text-surface-content/60 hover:border-surface-content/20 border-2 border-transparent'
				)}
			>
				Chart
			</button>
			<button
				onclick={() => (config.layout = 'node')}
				class={cls(
					'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
					config.layout === 'node'
						? 'bg-primary/20 text-primary border-primary border-2'
						: 'bg-surface-100 text-surface-content/60 hover:border-surface-content/20 border-2 border-transparent'
				)}
			>
				Node
			</button>
		</div>
	</div>
</div>

<div class="absolute left-4 top-28 z-10 flex gap-4">
	<!-- Connector Type -->
	<div class="bg-surface-100 border-surface-content/10 rounded-lg border-2 px-4 py-2">
		<div class="text-surface-content/60 mb-1 text-xs">Connector Type</div>
		<div class="flex items-center gap-2">
			<button
				onclick={() => (config.type = cyclePrev(connectorTypes, config.type))}
				class="hover:bg-surface-content/10 rounded p-1"
				aria-label="Previous connector type"
			>
				<svg
					class="h-4 w-4"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fill-rule="evenodd"
						d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
			<span class="min-w-[60px] text-center text-sm font-medium">{config.type}</span>
			<button
				onclick={() => (config.type = cycleNext(connectorTypes, config.type))}
				class="hover:bg-surface-content/10 rounded p-1"
				aria-label="Next connector type"
			>
				<svg
					class="h-4 w-4"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fill-rule="evenodd"
						d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>
	</div>

	<!-- Curve -->
	<div class="bg-surface-100 border-surface-content/10 rounded-lg border-2 px-4 py-2">
		<div class="text-surface-content/60 mb-1 text-xs">Curve</div>
		<div class="flex items-center gap-2">
			<button
				onclick={() => {}}
				class="hover:bg-surface-content/10 rounded p-1"
				aria-label="Previous curve type"
			>
				<svg
					class="h-4 w-4"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fill-rule="evenodd"
						d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
			<span class="min-w-[60px] text-center text-sm font-medium">{getCurveName(config.curve)}</span>
			<button
				onclick={() => {}}
				class="hover:bg-surface-content/10 rounded p-1"
				aria-label="Next curve type"
			>
				<svg
					class="h-4 w-4"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fill-rule="evenodd"
						d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>
	</div>

	<!-- Connector Sweep -->
	<div class="bg-surface-100 border-surface-content/10 rounded-lg border-2 px-4 py-2">
		<div class="text-surface-content/60 mb-1 text-xs">Connector Sweep</div>
		<div class="flex items-center gap-2">
			<button
				onclick={() => (config.sweep = cyclePrev(sweepOptions, config.sweep))}
				class="hover:bg-surface-content/10 rounded p-1"
				aria-label="Previous sweep option"
			>
				<svg
					class="h-4 w-4"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fill-rule="evenodd"
						d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
			<span class="min-w-[60px] text-center text-sm font-medium">{config.sweep}</span>
			<button
				onclick={() => (config.sweep = cycleNext(sweepOptions, config.sweep))}
				class="hover:bg-surface-content/10 rounded p-1"
				aria-label="Next sweep option"
			>
				<svg
					class="h-4 w-4"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fill-rule="evenodd"
						d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>
