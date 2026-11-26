<script lang="ts">
	// PROTOTYPE (#161): one person's face by name, drawn by the library's avatar (#379): their photo, or their
	// initials on their role's colour (#355), in a white border, with a presence dot top right (Justin's note 9): green
	// online, orange idle, grey offline, from when the server last saw them (`presenceOf`). A list that keeps its own
	// time (the menu's Online panel, #331) gives the dot it read, so the dot and its words never disagree.
	import { Avatar } from '@layerd/ui';
	import type { InitialsToneType } from './initials';
	import { faceOf } from './marks';
	import type { PresenceType } from './team.data';

	let {
		name,
		size = 36,
		ring = 'ring-white',
		isMuted = false,
		hasPresence = true,
		badge,
		badgeScale = 0.42,
		presence,
		tone
	}: {
		name: string;
		size?: number;
		ring?: string;
		isMuted?: boolean;
		hasPresence?: boolean;
		// A mark to wear at the bottom right, in place of the presence dot: on the report it marks the organization's
		// own people (run 32). It is a round picture that fills the mark, under half as wide as the face: the app's own
		// icon, the bright logo on black (Justin, 2026-11-19, #246; before that the light logo on white, top right).
		badge?: string;
		// How wide the mark is, as a share of the face: smaller on a big photo (the report's signature).
		badgeScale?: number;
		// The dot to show, when the screen has read it already.
		presence?: PresenceType;
		// Whose initials these are when there is no photo, in place of the Team record's role: a project's Personnel
		// (black on white, #355).
		tone?: InitialsToneType;
	} = $props();
</script>

<Avatar
	{...faceOf(name, { tone, presence, hasPresence })}
	{size}
	ring="ring-2 {ring}"
	{isMuted}
	{badge}
	{badgeScale}
/>
