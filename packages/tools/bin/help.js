#!/usr/bin/env node
import("../src/checks/help.ts").then((m) => m.run()).catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
