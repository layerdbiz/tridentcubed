<script lang="ts">
	// The status pill on a project's Page (#376): the status in its colour, and a tap opens the library's Menu of every
	// status in the order a project moves through them, each with its dot and a tick by the one it is now. A pick goes
	// through the app's own status change (look.setStatus), which saves it, says so, and keeps archiving to an Admin.
	// The Change Status sheet (status-sheet.svelte) stays for the ⋮ menu's Change Status.
	import { STATUS, type ProjectType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { STATES } from './records.data';
	import { Menu, type MenuOptionType } from '@layerd/ui';

	let { look, project }: { look: LookState; project: ProjectType } = $props();

	const OPTIONS: MenuOptionType[] = STATES.map((status) => ({
		id: status,
		label: status,
		dot: STATUS[status].dot
	}));
</script>

<Menu
	label="Change Status"
	value={project.status}
	options={OPTIONS}
	align="left"
	onpick={(status) => look.setStatus(project, status as ProjectType['status'])}
>
	{#snippet trigger()}
		<span
			class="inline-flex items-center gap-1 rounded-full py-1 pr-2 pl-3 text-xs font-semibold text-white {STATUS[
				project.status
			].bar}">{project.status}<span class="icon-[mdi--chevron-down] size-4"></span></span
		>
	{/snippet}
</Menu>
