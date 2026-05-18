#!/usr/bin/env node

const args = process.argv.slice(2);
const normalizedArgs = args.filter((arg) => arg !== "--");
const command = normalizedArgs[0];
const apps = normalizedArgs.slice(1);

import("../src/generators/workspace-launcher.ts")
	.then((module) => module.run(command, apps))
	.catch((error) => {
		console.error("Command failed:", error);
		process.exit(1);
	});
