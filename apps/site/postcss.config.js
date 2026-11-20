import lightDarkFn from '@csstools/postcss-light-dark-function';

// The plugin's default, never `preserve: false`: that hands every browser the stand-in's every-element rule, which
// froze taps, swipes and Preview drags (#251). `apps/app/src/postcss.test.ts` holds every app to it.
export default {
	plugins: [lightDarkFn()]
};
