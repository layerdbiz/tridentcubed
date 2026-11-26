// A component's own default look, with the caller's shorthands winning over it. The base component reads `color`
// before the shorthands, so a component that defaults `color = 'primary'` would beat a caller's `accent`: a
// component with a default look resolves it here first, and hands it to the part that wears it (the Badge's box, the
// Progress bar's filled part, #380, #381). Both read only the look's own props: a copy of everything would walk the
// props proxies again, which a list of badges pays for in every row (#381, measured).
import type { ComponentProps } from './component.svelte.ts';

/** The theme's colours, as `color` and as shorthands, in the order the base component reads them. */
export const LOOK_COLORS = ['primary', 'secondary', 'accent', 'danger', 'neutral', 'base'] as const;
/** The appearances, as `appearance` and as shorthands. */
export const LOOK_APPEARANCES = ['heavy', 'lite', 'outline', 'ghost', 'glass', 'gradient'] as const;

const LOOK_KEYS = new Set<PropertyKey>([...LOOK_COLORS, ...LOOK_APPEARANCES, 'invert']);

/** What a component's look is: its colour, its appearance and whether it is inverted. */
export type LookType = Pick<ComponentProps, 'color' | 'appearance' | 'invert'>;

/** The look a component wears: a shorthand the caller gave, or else the component's own default. */
export function toLook(props: object, defaults: LookType): LookType {
	const given = props as Record<string, unknown>;
	return {
		color: LOOK_COLORS.find((each) => given[each] === true) ?? defaults.color,
		appearance: LOOK_APPEARANCES.find((each) => given[each] === true) ?? defaults.appearance,
		invert: (given.invert as boolean | undefined) ?? defaults.invert
	};
}

/** The props without the look's shorthands and `invert`, for a part that must not wear the look. */
export function withoutLook<T extends object>(props: T): T {
	const rest: Record<PropertyKey, unknown> = {};
	for (const key of Reflect.ownKeys(props)) {
		if (!LOOK_KEYS.has(key)) rest[key] = (props as Record<PropertyKey, unknown>)[key];
	}
	return rest as T;
}
