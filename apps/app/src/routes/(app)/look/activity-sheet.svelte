<script lang="ts">
	// View Activity (#403; Justin, 2026-11-28: "if it's got a 3-dot menu, they should be able to click on it and click
	// on the view activity, and it would pop up the activity log for that entire project or whatever it is"): one
	// project's or record's own Activity Log in a window over the page, newest first. It is the Activity Log itself
	// (activity-log.svelte, the same list as the bell's), about what the ⋮ menu was opened on: a project with
	// everything inside it, a customer with its contacts, a Team member with their places on projects, a Transport Mode
	// or a Facility. Anyone who can see the thing sees its changes; of who opened a project or downloaded its PDF, an
	// Admin sees everyone's and anyone else their own. On a phone it fills the whole screen, with no gap at the top
	// (Justin, 2026-11-28), and its name is one line; from tablet width it is the tall box.
	import { Dialog } from '@layerd/ui';
	import WindowHead from '#lib/releases/window-head.svelte';
	import { HEADING_HEIGHT, KEEP } from './activity-list.svelte';
	import ActivityLog from './activity-log.svelte';
	import type { LookState } from './look.state.svelte';

	let { look }: { look: LookState } = $props();

	// How tall the Log's controls are, stuck to the top: the fade starts under them and a day heading.
	let top = $state(0);

	function close() {
		look.activityOf = undefined;
	}
</script>

{#if look.activityOf}
	{@const of = look.activityOf}
	<Dialog
		label="Activity of {of.name}"
		variant="full"
		fade="y"
		scroller={{ inset: { top: HEADING_HEIGHT + top }, keep: KEEP }}
		onclose={close}
	>
		{#snippet header()}
			<div class="pt-3 md:pt-0">
				<WindowHead
					title="Activity"
					note={of.name}
					onclose={close}
				/>
			</div>
		{/snippet}
		<div class="pt-3 pb-4">
			{#key `${of.about.table}/${of.about.rowId}`}
				<ActivityLog
					{look}
					about={of.about}
					ontap={close}
					bind:top
				/>
			{/key}
		</div>
	</Dialog>
{/if}
