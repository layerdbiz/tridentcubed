// A component's own default look, with the caller's shorthands winning over it (#380, #381): the base reads `color`
// before `accent`, so a component that defaults `color = 'primary'` would otherwise beat a caller's `accent`.
import { describe, expect, it } from 'vite-plus/test';
import { toLook, withoutLook } from './look.ts';

describe('toLook', () => {
	it("keeps the component's own look when the caller gives none", () => {
		expect(toLook({ class: 'mt-2' }, { color: 'primary', appearance: 'heavy' })).toEqual({
			color: 'primary',
			appearance: 'heavy',
			invert: undefined
		});
	});

	it("lets a shorthand colour and appearance win over the component's own", () => {
		expect(toLook({ accent: true, lite: true }, { color: 'primary', appearance: 'heavy' })).toEqual(
			{
				color: 'accent',
				appearance: 'lite',
				invert: undefined
			}
		);
	});

	it('takes the shorthand the base component would, when several are given', () => {
		expect(toLook({ base: true, primary: true }, {}).color).toBe('primary');
	});

	it('ignores a shorthand set to false, and carries invert', () => {
		expect(toLook({ accent: false, invert: true }, { color: 'primary' })).toEqual({
			color: 'primary',
			appearance: undefined,
			invert: true
		});
	});
});

describe('withoutLook', () => {
	it('leaves out the shorthands and invert, and keeps everything else', () => {
		expect(
			withoutLook({ danger: true, ghost: true, invert: true, sm: true, label: 'Done' })
		).toEqual({
			sm: true,
			label: 'Done'
		});
	});
});
