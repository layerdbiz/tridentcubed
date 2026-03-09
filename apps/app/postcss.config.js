import lightDarkFn from "@csstools/postcss-light-dark-function";

export default {
	plugins: [
		lightDarkFn({ preserve: false }),
	],
};
