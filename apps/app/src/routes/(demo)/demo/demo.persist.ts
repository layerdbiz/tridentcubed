import { createPersistNew } from "@layerd/ui";

const controller = createPersistNew();

function toValuePath(basePath: string): string {
	return `${basePath}.value`;
}

export const persist = {
	read(basePath: string, fallback = ""): string {
		return controller.read<string>(toValuePath(basePath)) ?? fallback;
	},

	remove(basePath: string): void {
		controller.remove(toValuePath(basePath));
	},

	clear(scope = "inputs"): void {
		controller.clear(scope);
	},
};
