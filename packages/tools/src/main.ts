#!/usr/bin/env node --experimental-strip-types

export async function main() {
	try {
		// Get the command from command line arguments (default to barrels)
		const command = process.argv[2] || "barrels";

		switch (command) {
			case "barrels": {
				const { run } = await import("./generators/barrels.ts");
				await run();
				break;
			}
			case "sheetari": {
				const { run } = await import("./generators/sheetari.ts");
				await run();
				break;
			}
			case "stories": {
				const { run } = await import("./generators/stories.ts");
				await run();
				break;
			}
			case "types": {
				const { run } = await import("./generators/types.ts");
				await run();
				break;
			}
			case "workspace": {
				const { run } = await import("./generators/workspace-launcher.ts");
				await run(process.argv[3]);
				break;
			}
			default: {
				console.error(`Unknown command: ${command}`);
				console.error(
					"Available commands: barrels, sheetari, stories, types, workspace",
				);
				process.exit(1);
			}
		}
	} catch (error) {
		console.error("Command failed:", error);
		process.exit(1);
	}
}

// Always run when this file is executed directly
main();

// Export for programmatic use
export { run as barrels } from "./generators/barrels.ts";
export { run as sheetari } from "./generators/sheetari.ts";
export { run as stories } from "./generators/stories.ts";
export { run as types } from "./generators/types.ts";
export { run as workspace } from "./generators/workspace-launcher.ts";
