// A component's own default look, with the caller's shorthands winning over it (#380, #381): the base reads `color`
// before `accent`, so a component that defaults `color = 'primary'` would otherwise beat a caller's `accent`.
import { describe, expect, it } from 'vite-plus/test';
import { toLook } from './look.ts';

describe('toLook', () => {
	it("keeps the component's own look when the caller gives none", () => {
		const { look, rest } = toLook({ class: 'mt-2' }, { color: 'primary', appearance: 'heavy' });

		expect(look).toEqual({ color: 'primary', appearance: 'heavy', invert: undefined });
		expect(rest).toEqual({ class: 'mt-2' });
	});

	it("lets a shorthand colour and appearance win over the component's own", () => {
		const { look } = toLook(
			{ accent: true, lite: true },
			{ color: 'primary', appearance: 'heavy' }
		);

		expect(look).toEqual({ color: 'accent', appearance: 'lite', invert: undefined });
	});

	it('takes the shorthands and invert out of the rest, so they land only where the look goes', () => {
		const { look, rest } = toLook(
			{ danger: true, ghost: true, invert: true, sm: true, label: 'Done' },
			{ color: 'primary' }
		);

		expect(look).toEqual({ color: 'danger', appearance: 'ghost', invert: true });
		expect(rest).toEqual({ sm: true, label: 'Done' });
	});

	it('ignores a shorthand set to false', () => {
		const { look } = toLook({ accent: false }, { color: 'primary' });

		expect(look.color).toBe('primary');
	});
});
