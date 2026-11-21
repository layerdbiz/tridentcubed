<script lang="ts">
	// Report Cover, look C (#247; the final design is #256, settled by Justin on 2026-11-21): the cover's list
	// under the trip's strip. Customer, Company, Team, Type, Created, Completed; Transport Mode and Facility are
	// the strip's. The list is two halves that meet on the page's centre line, under the middle of the logo: the
	// icons and labels end there and the values begin there, however long a value is. Customer and Company lead
	// with their logo, Team with the team's own faces. Looks A and B are kept beside it as they were.
	import { toCrossOrigin } from '#lib/files/files.schema.js';
	import ClientLogo from '../client-logo.svelte';
	import { personOf } from '../look.data';

	export type CoverLineType = {
		label: string;
		value: string;
		icon: string;
		// The customer's own number: after the value in a mono font, lighter and smaller.
		note?: string;
		// The picture the value leads with: the customer's own logo by its name, or a picture's address.
		customer?: string;
		logo?: string;
		// The team's own people, lead first: their faces stand in place of the value.
		names?: string[];
		// What follows the faces: the count of the others who were there.
		more?: string;
	};

	let { lines }: { lines: CoverLineType[] } = $props();

	// The most faces a line shows.
	const FACES = 8;
</script>

<dl
	class="lines"
	style="grid-template-rows: repeat({lines.length}, auto)"
>
	<div class="keys">
		{#each lines as line (line.label)}
			<span class="{line.icon} mt-px size-4 text-primary"></span>
			<dt>{line.label}</dt>
		{/each}
	</div>
	<div class="vals">
		{#each lines as line (line.label)}
			{#if line.names?.length}
				<dd class="has-mark">
					<!-- The lead in front, ringed in blue; each of the others tucked behind the one before. -->
					<span class="faces">
						{#each line.names.slice(0, FACES) as name, index (name)}
							{@const photo = personOf(name).photo}
							{#if photo.startsWith('data:image/svg+xml,')}
								<!-- Someone with no photo yet shows a person icon on grey. -->
								<span
									class="face"
									style="z-index: {FACES - index}"
									role="img"
									aria-label={name}><span class="icon-[mdi--account] size-[62%]"></span></span
								>
							{:else}
								<img
									class="face"
									style="z-index: {FACES - index}"
									src={photo}
									crossorigin={toCrossOrigin(photo)}
									alt={name}
								/>
							{/if}
						{/each}
					</span>
					{#if line.more}<span class="more">{line.more}</span>{/if}
				</dd>
			{:else if line.value && (line.customer || line.logo)}
				<dd class="has-mark">
					{#if line.customer}
						<ClientLogo
							name={line.customer}
							size={24}
							shape="circle"
						/>
					{:else}
						<img
							class="mark"
							src={line.logo}
							alt=""
							draggable="false"
						/>
					{/if}
					<span class="min-w-0 truncate"
						>{line.value}{#if line.note}&nbsp;<span class="id">{line.note}</span>{/if}</span
					>
				</dd>
			{:else}
				<dd class="line-clamp-2 {line.value ? '' : 'text-slate-300 italic'}">
					{line.value || 'Not filled in yet'}
				</dd>
			{/if}
		{/each}
	</div>
</dl>

<style>
	/* Both halves share the list's rows, 13 apart so the pictures do not touch; 27 lies between the labels and the
	   values, half of it either side of the centre line. */
	.lines {
		margin: 0;
		padding-inline: 28px;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 13px 27px;
		text-align: left;
		font-size: 12px;
	}
	.keys,
	.vals {
		grid-row: 1 / -1;
		display: grid;
		grid-template-rows: subgrid;
		align-items: start;
	}
	.keys {
		grid-column: 1;
		grid-template-columns: auto auto;
		justify-content: end;
		column-gap: 10px;
	}
	.vals {
		grid-column: 2;
		justify-items: start;
		min-width: 0;
	}
	dt {
		font-weight: 600;
		line-height: 1.375;
		color: #0f172a;
	}
	dd {
		margin: 0;
		max-width: 100%;
		line-height: 1.375;
		color: #475569;
		font-variant-numeric: tabular-nums;
	}
	/* A row that leads with a picture: a logo, or the team's faces. It never breaks onto two lines. A logo is
	   exactly as big as the lead's face with its blue ring: 24 across. */
	dd.has-mark {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-block: -4px;
		min-width: 0;
		white-space: nowrap;
	}
	.mark {
		display: block;
		width: 24px;
		height: 24px;
		flex: none;
		border-radius: 50%;
		object-fit: cover;
		background: #fff;
		box-shadow: 0 0 0 1px rgb(15 23 42 / 0.1);
	}
	/* Three quarters of 10 px, by scale and not by font size: a phone will not draw text under 8 px. */
	.id {
		display: inline-block;
		font-family:
			ui-monospace, 'SF Mono', SFMono-Regular, 'Cascadia Mono', 'Roboto Mono', Menlo, Consolas,
			monospace;
		font-size: 10px;
		color: #94a3b8;
		transform: scale(0.75);
		transform-origin: 0 72%;
	}
	.faces {
		display: flex;
		align-items: center;
		flex: none;
	}
	/* A face is 20 across with a thin rim in the band's own gray, and overlaps the one before it by 7. */
	.face {
		position: relative;
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		margin-left: -7px;
		flex: none;
		border-radius: 50%;
		object-fit: cover;
		background: #e2e8f0;
		color: #94a3b8;
		box-shadow: 0 0 0 1.5px #f1f5f9;
	}
	/* The lead: 18 across, a thin gap, then the blue ring, 24 in all. */
	.face:first-child {
		width: 18px;
		height: 18px;
		margin: 3px;
		box-shadow:
			0 0 0 1px #f1f5f9,
			0 0 0 3px var(--color-primary);
	}
	/* The count sits a little closer to the last face. */
	.more {
		margin-left: -3px;
	}
</style>
