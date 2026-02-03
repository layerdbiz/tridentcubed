// ESM syntax
import tailwindPostcss from "@tailwindcss/postcss";
import lightDarkFn from "@csstools/postcss-light-dark-function";

const isDev = process.env.NODE_ENV === "development";

// Using @tailwindcss/postcss for all Tailwind processing (NOT @tailwindcss/vite)
// This avoids conflicts between having both plugins active

export default {
	plugins: [
		tailwindPostcss(),
		// Only run light-dark in production
		!isDev && lightDarkFn({ preserve: false }),
	].filter(Boolean),
};
