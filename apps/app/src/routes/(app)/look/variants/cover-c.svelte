<script lang="ts">
	// Report Cover, look C (#247; the final design is #256, settled by Justin on 2026-11-21): the cover's list
	// under the trip's strip. Customer, Company, Team, Type, Reference (only when the project has a reference
	// number, #273), Created, Completed; Transport Mode and Facility are the strip's. The list is two halves that
	// meet on the page's centre line, under the middle of the logo: the icons and labels end there and the values
	// begin there, however long a value is. Customer and Company lead with their logo, Team with the team's own
	// faces. Looks A and B are kept beside it as they were.
	import { Avatar } from '@layerd/ui';
	import { faceOf, logoOf } from '../marks';

	export type CoverLineType = {
		label: string;
		value: string;
		icon: string;
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
					<!-- The lead in front, ringed in blue; each of the others tucked behind the one before. Someone with no
					     photo yet shows their initials on their role's colour (#355). -->
					<span class="faces">
						{#each line.names.slice(0, FACES) as name, index (name)}
							<span
								class="face"
								style="z-index: {FACES - index}"
								><Avatar
									{...faceOf(name, { hasPresence: false })}
									size={index ? 20 : 18}
									ring={index
										? 'ring-[1.5px] ring-slate-100'
										: 'ring-2 ring-primary ring-offset-1 ring-offset-slate-100'}
								/></span
							>
						{/each}
					</span>
					{#if line.more}<span class="more">{line.more}</span>{/if}
				</dd>
			{:else if line.value && (line.customer || line.logo)}
				<dd class="has-mark">
					{#if line.customer}
						<Avatar
							{...logoOf(line.customer, { shape: 'circle' })}
							size={24}
						/>
					{:else}
						<Avatar
							src={line.logo}
							alt=""
							size={24}
							ring="ring-1 ring-slate-900/10"
						/>
					{/if}
					<span class="min-w-0 truncate">{line.value}</span>
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
	.faces {
		display: flex;
		align-items: center;
		flex: none;
	}
	/* A face is 20 across with a thin rim in the band's own gray (its ring), and overlaps the one before it by 7. */
	.face {
		position: relative;
		display: flex;
		margin-left: -7px;
		flex: none;
	}
	/* The lead: 18 across, a thin gap, then the blue ring, 24 in all. */
	.face:first-child {
		margin: 3px;
	}
	/* The count sits a little closer to the last face. */
	.more {
		margin-left: -3px;
	}
</style>
