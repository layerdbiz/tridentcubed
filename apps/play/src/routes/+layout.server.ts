import type { LayoutServerLoad } from "./$types";
import { isMqBucket, MQ_COOKIE_KEY } from "@layerd/ui";

export const load: LayoutServerLoad = ({ cookies }) => {
	const initialMqBucket = cookies.get(MQ_COOKIE_KEY) ?? null;

	return {
		initialMqBucket: isMqBucket(initialMqBucket) ? initialMqBucket : null,
	};
};
