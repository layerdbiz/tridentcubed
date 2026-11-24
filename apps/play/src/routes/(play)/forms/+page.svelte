<script lang="ts">
	// The library's inputs with their Help text ? and a Generated value (#284, #299): try each empty and filled, typed
	// over and reset, with a mouse and on a phone.
	import { Input, Select, Textarea } from '@layerd/ui';

	let title = $state('');
	let subtitle = $state('Example cargo, serial 0001');
	let description = $state('');
	let day = $state('');
	let job = $state('2');
	let type = $state('Cargo');
	const sentence =
		'This is to report that the surveyor was present at the terminal for the purpose of conducting a cargo survey.';
</script>

<main class="forms-demo">
	<h1>Inputs: help and Generated values</h1>
	<Input
		label="Title"
		bind:value={title}
		help="The report's name, usually the vessel or the main cargo. It prints large on the cover."
	/>
	<Input
		label="Subtitle"
		bind:value={subtitle}
		help="A second line under the title on the cover."
	/>
	<Textarea
		label="Description"
		bind:value={description}
		generated={sentence}
		help="The report's opening sentence. The app writes it from this project's panels; what you type prints in its place."
	/>
	<Select
		label="Project Type"
		bind:value={type}
		options={['Cargo', 'Vessel Condition', 'Warehousing'].map((name) => ({
			label: name,
			value: name
		}))}
		help="The kind of survey."
	/>
	<div class="pair">
		<Input
			label="Created Date"
			type="date"
			bind:value={day}
			generated="2026-10-27"
			help="The day the job was accepted. It is part of the project number."
		/>
		<Input
			label="Job Number"
			bind:value={job}
			generated="1"
			inputmode="numeric"
			help="Which of this customer's jobs on that date this is."
		/>
	</div>
	<pre>{JSON.stringify({ title, subtitle, description, day, job, type }, null, 1)}</pre>
</main>

<style>
	.forms-demo {
		display: grid;
		gap: 1.5rem;
		max-width: 28rem;
		margin: 0 auto;
		padding: 2rem 1rem 6rem;
	}
	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	pre {
		font-size: 0.75rem;
		white-space: pre-wrap;
	}
</style>
