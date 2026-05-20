import { type DemoSeedType, getDemoData } from "./demo.remote";

let demo_seed_cache: DemoSeedType | null = null;
let demo_seed_request: Promise<DemoSeedType> | null = null;

export function readDemoDataCache(): DemoSeedType | null {
	return demo_seed_cache;
}

export async function getCachedDemoData(): Promise<DemoSeedType> {
	if (demo_seed_cache) {
		return demo_seed_cache;
	}

	if (!demo_seed_request) {
		demo_seed_request = getDemoData()
			.then((seed) => {
				demo_seed_cache = seed;
				return seed;
			})
			.finally(() => {
				demo_seed_request = null;
			});
	}

	return demo_seed_request;
}
