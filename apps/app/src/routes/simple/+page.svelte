<script lang="ts">
	import { Grid, Item, Input, Select, Text, Textarea } from '@layerd/ui';
	import { Page, Panel } from '$lib';
	import { fetchSimpleDefinitions } from './simple.remote';
	import type * as simpleTypes from './simple.types';

	const simpleDefinitions: simpleTypes.SimpleDefinitionsType = await fetchSimpleDefinitions();

	let fieldValues = $state<Record<string, string>>(
		Object.fromEntries(
			simpleDefinitions.inputs.map((inputDefinition: simpleTypes.SimpleInputDefinitionType) => [
				inputDefinition.id,
				inputDefinition.value
			])
		)
	);

	function isRemoved(visibility: simpleTypes.SimpleVisibilityType | null): boolean {
		return visibility === 'none';
	}

	function matchesPanel(
		inputDefinition: simpleTypes.SimpleInputDefinitionType,
		panelDefinition: simpleTypes.SimplePanelDefinitionType
	): boolean {
		return (
			inputDefinition.panel === panelDefinition.id ||
			inputDefinition.panel === panelDefinition.title
		);
	}

	function matchesPage(
		inputDefinition: simpleTypes.SimpleInputDefinitionType,
		pageDefinition: simpleTypes.SimplePageDefinitionType
	): boolean {
		return inputDefinition.page.some(
			(pageReference: string) =>
				pageReference === pageDefinition.id || pageReference === pageDefinition.page
		);
	}

	function getInputValue(inputDefinition: simpleTypes.SimpleInputDefinitionType): string {
		return fieldValues[inputDefinition.id] ?? '';
	}

	function getDisplayValue(inputDefinition: simpleTypes.SimpleInputDefinitionType): string {
		const value = getInputValue(inputDefinition);
		if (value) return value;
		if (inputDefinition.placeholder) return inputDefinition.placeholder;
		if (inputDefinition.example) return inputDefinition.example;

		return '—';
	}

	function getSelectOptions(inputDefinition: simpleTypes.SimpleInputDefinitionType) {
		return inputDefinition.options.map((option: string) => ({
			label: option,
			value: option
		}));
	}

	function getInputType(inputDefinition: simpleTypes.SimpleInputDefinitionType): string {
		if (
			inputDefinition.input === 'date' ||
			inputDefinition.input === 'datetime' ||
			inputDefinition.input === 'number' ||
			inputDefinition.input === 'email' ||
			inputDefinition.input === 'tel' ||
			inputDefinition.input === 'url'
		) {
			return inputDefinition.input;
		}

		return 'text';
	}

	const visibleInputs = $derived.by(() =>
		simpleDefinitions.inputs
			.filter(
				(inputDefinition: simpleTypes.SimpleInputDefinitionType) =>
					!isRemoved(inputDefinition.visibility)
			)
			.filter(
				(inputDefinition: simpleTypes.SimpleInputDefinitionType) =>
					inputDefinition.input !== 'hidden'
			)
			.sort(
				(left: simpleTypes.SimpleInputDefinitionType, right: simpleTypes.SimpleInputDefinitionType) =>
					left.order - right.order
			)
	);

	const renderedPanels = $derived.by(() =>
		simpleDefinitions.panels
			.filter(
				(panelDefinition: simpleTypes.SimplePanelDefinitionType) =>
					!isRemoved(panelDefinition.visibility)
			)
			.filter(
				(panelDefinition: simpleTypes.SimplePanelDefinitionType) => panelDefinition.enabled
			)
			.sort(
				(left: simpleTypes.SimplePanelDefinitionType, right: simpleTypes.SimplePanelDefinitionType) =>
					left.order - right.order
			)
			.map((panelDefinition: simpleTypes.SimplePanelDefinitionType) => ({
				panel: panelDefinition,
				inputs: visibleInputs.filter((inputDefinition: simpleTypes.SimpleInputDefinitionType) =>
					matchesPanel(inputDefinition, panelDefinition)
				)
			}))
			.filter(
				(entry: simpleTypes.SimpleRenderedPanelType) =>
					entry.inputs.length > 0 || entry.panel.required
			)
	);

	const renderedPages = $derived.by(() =>
		simpleDefinitions.pages
			.filter(
				(pageDefinition: simpleTypes.SimplePageDefinitionType) =>
					!isRemoved(pageDefinition.visibility)
			)
			.sort(
				(left: simpleTypes.SimplePageDefinitionType, right: simpleTypes.SimplePageDefinitionType) =>
					left.order - right.order
			)
			.map((pageDefinition: simpleTypes.SimplePageDefinitionType) => ({
				page: pageDefinition,
				inputs: visibleInputs.filter((inputDefinition: simpleTypes.SimpleInputDefinitionType) =>
					matchesPage(inputDefinition, pageDefinition)
				)
			}))
			.filter(
				(entry: simpleTypes.SimpleRenderedPageType) =>
					entry.page.include || entry.inputs.length > 0
			)
	);
</script>

<div class="h-svh overflow-hidden">
	<Grid items="a1:b1" class="h-full gap-4 p-4">

		<!-- Panels
		------------------------------------------------------------------------->
		<Item range="a1:a1" col="420px" class="grid auto-rows-min gap-4 border-r border-neutral-300 p-4">
			<Text h2="Panels" />

			{#if renderedPanels.length}
				{#each renderedPanels as entry (entry.panel.id)}
					<Panel name="group1" label={entry.panel.title} layout={entry.panel.layout} open>
						<div class="grid gap-3" class:grid-cols-2={entry.panel.layout === 'list'}>
							{#each entry.inputs as inputDefinition (inputDefinition.id)}
								{#if inputDefinition.input === 'textarea' || inputDefinition.input === 'richtext'}
									<Textarea
										xs
										variant="text"
										label={inputDefinition.label}
										placeholder={inputDefinition.placeholder || ' '}
										readonly={entry.panel.readonly || inputDefinition.readonly}
										required={inputDefinition.required}
										bind:value={fieldValues[inputDefinition.id]}
									/>
								{:else if inputDefinition.input === 'select' || inputDefinition.input === 'select multiple'}
									<Select
										xs
										variant="text icon"
										icon="chevron-down"
										label={inputDefinition.label}
										options={getSelectOptions(inputDefinition)}
										multiple={inputDefinition.input === 'select multiple'}
										required={inputDefinition.required}
										disabled={entry.panel.readonly || inputDefinition.readonly}
										bind:value={fieldValues[inputDefinition.id]}
									/>
								{:else}
									<Input
										xs
										variant="text"
										label={inputDefinition.label}
										type={getInputType(inputDefinition)}
										placeholder={inputDefinition.placeholder || ' '}
										readonly={entry.panel.readonly || inputDefinition.readonly}
										required={inputDefinition.required}
										bind:value={fieldValues[inputDefinition.id]}
									/>
								{/if}
							{/each}
						</div>
					</Panel>
				{/each}
			{/if}
		</Item>

		<!-- Pages 
		------------------------------------------------------------------------->
		<Item range="b1:b1" class="min-w-0 overflow-y-auto overflow-x-hidden p-4">
			<Text h2="Pages" />

			{#if renderedPages.length}
				<div class="origin-top-left flex flex-wrap gap-20 pt-4" style="zoom: 0.35;">
					{#each renderedPages as entry (entry.page.id)}
						<Page layout={entry.page.layout} label={entry.page.page}>
							<Text h4={entry.page.page} />
							{#each entry.inputs as inputDefinition (inputDefinition.id)}
								<div>
									<Text small={inputDefinition.label} />
									<Text p={getDisplayValue(inputDefinition)} />
								</div>
							{/each}
						</Page>
					{/each}
				</div>
			{/if}
		</Item>
	</Grid>
</div>
