#!/usr/bin/env node

const args = process.argv.slice(2);
const normalizedArgs = args[0] === "--" ? args.slice(1) : args;
const command = normalizedArgs[0];
const workspaceArgs = normalizedArgs.slice(1);

import("../src/generators/workspace-launcher.ts")
	.then((module) => module.run(command, workspaceArgs))
	.catch((error) => {
		console.error("Command failed:", error);
		process.exit(1);
	});
