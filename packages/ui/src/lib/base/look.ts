// A component's own default look, with the caller's shorthands winning over it. The base component reads `color`
// before the shorthands, so a component that defaults `color = 'primary'` would beat a caller's `accent`: a
// component with a default look splits it out here first, and passes the look to the part that wears it (the
// Badge's box, the Progress bar's filled part, #380, #381).
import type { ComponentProps } from './component.svelte.ts';

/** The theme's colours, as `color` and as shorthands, in the order the base component reads them. */
export const LOOK_COLORS = ['primary', 'secondary', 'accent', 'danger', 'neutral', 'base'] as const;
/** The appearances, as `appearance` and as shorthands. */
export const LOOK_APPEARANCES = ['heavy', 'lite', 'outline', 'ghost', 'glass', 'gradient'] as const;

/** What a component's look is: its colour, its appearance and whether it is inverted. */
export type LookType = Pick<ComponentProps, 'color' | 'appearance' | 'invert'>;

/** Splits props into the look, a shorthand winning over the component's own default, and everything else. */
export function toLook<T extends object>(
	props: T,
	defaults: LookType
): { look: LookType; rest: T } {
	const rest = { ...props } as Record<string, unknown>;
	const look: LookType = {
		color: LOOK_COLORS.find((each) => rest[each] === true) ?? defaults.color,
		appearance: LOOK_APPEARANCES.find((each) => rest[each] === true) ?? defaults.appearance,
		invert: (rest.invert as boolean | undefined) ?? defaults.invert
	};
	for (const each of [...LOOK_COLORS, ...LOOK_APPEARANCES, 'invert']) delete rest[each];
	return { look, rest: rest as T };
}
