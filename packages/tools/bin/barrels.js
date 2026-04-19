#!/usr/bin/env node
import("../src/generators/barrels.ts").then((m) =>
	m.run ? m.run() : console.error("No run export found")
).catch(console.error);
