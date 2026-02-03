<script lang="ts">
	/**
	 * @tags ui
	 * @layout horizontal
	 */
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface TableColumn {
		key: string;
		label: string;
		align?: 'left' | 'center' | 'right';
		width?: string;
		type?: 'text' | 'date' | 'number' | 'action';
	}

	export interface TableProps extends ComponentProps {
		columns?: TableColumn[];
		data?: Record<string, any>[];
		hoverable?: boolean;
		striped?: boolean;
		bordered?: boolean;
		compact?: boolean;
	}

	let {
		columns = [],
		data = [],
		hoverable = true,
		striped = false,
		bordered = false,
		compact = false,
		children = undefined,
		...props
	}: TableProps = $props();

	// Generate alignment class
	const getAlignClass = (align?: string) => {
		switch (align) {
			case 'center':
				return 'text-center';
			case 'right':
				return 'text-right';
			default:
				return 'text-left';
		}
	};

	// Get cell value from row data using column key
	const getCellValue = (row: Record<string, any>, key: string) => {
		return row[key] ?? '';
	};
</script>

<!-- Template 
::::::::::::::::::::::::::::::::::::::::::::: -->
<Component
	{...props}
	class="table-wrapper {props.class} mb-4"
>
	{#snippet component(componentProps)}
		<div
			{...componentProps}
			class="h-full w-full overflow-y-auto"
		>
			{#if children}
				{@render children()}
			{:else}
				<table class="w-full table-fixed">
					<!-- Table Head -->
					<thead class="sticky top-0 z-10">
						<tr class="">
							{#each columns as column}
								<th
									class="border-b-4 border-neutral-950 py-2 text-xs font-semibold uppercase {getAlignClass(
										column.align
									)}"
									style={column.width ? `width: ${column.width}` : ''}
								>
									{column.label}
								</th>
							{/each}
						</tr>
					</thead>

					<!-- Table Body -->
					<tbody>
						{#each data as row, rowIndex}
							<tr
								class="border-b border-neutral-200 {hoverable
									? 'hover:bg-neutral/10'
									: ''} {striped && rowIndex % 2 === 1 ? 'bg-neutral/30' : ''}"
							>
								{#each columns as column}
									<td
										class="py-2 {getAlignClass(column.align)} {compact ? 'text-sm' : ''}"
										style={column.width ? `width: ${column.width}` : ''}
									>
										{getCellValue(row, column.key)}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	/* Dont add any style here. Always use tailwind classes in the markup. */
</style>
