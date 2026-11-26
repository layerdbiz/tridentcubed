/**
 * Workspace launcher: the `pnpm dev|watch|build|preview` front door.
 *
 * Contract (ticket #9, 2026-09-18; see ../../README.md for the full model):
 * - Reads the root package.json `apps` map (object of booleans, or array).
 *   Enabled apps are the default selection; positional app names on the
 *   command line replace that selection; anything after `--` goes to
 *   `vp run` as its own options.
 * - Validates every selected name against the `name` field of each
 *   package.json under apps/. (Do not write that path as a glob here:
 *   star-slash would close this comment and break type stripping.)
 * - Spawns Vite+'s task runner (the `vp` bin of `vite-plus`, found through
 *   its package.json) with the current Node binary, so no shell is needed
 *   on Windows (#369). The tasks are `workspace:dev|build|preview`: each
 *   app's come from `createAppConfig` (packages/config/vite), the root's
 *   barrels watcher from the root `vite.config.ts`.
 * - dev = vp run --parallel --filter <root> --filter <app> workspace:dev,
 *   the barrels watcher and each app's dev server at once. `--parallel`
 *   because a dev task that waited on the never-ending watcher would never
 *   start.
 *   watch = dev (kept as an alias; it added the stories generator until
 *   that generator was archived on #100)
 *   build = vp run --filter <app> workspace:build (barrels first, cached)
 *   preview = vp run --parallel --filter <app> workspace:preview
 * - The map is a developer convenience. It never limits which barrels or
 *   symlinks the generators produce, and Vercel does not use it:
 *   Vercel runs `pnpm build` inside apps/site and apps/app directly.
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { resolvePath } from "../utils.ts";

type WorkspaceCommand = "build" | "dev" | "preview" | "watch";
type RootAppsConfig =
	| string[]
	| Record<string, boolean | "true" | "false">;

interface RootPackageJson {
	name?: string;
	apps?: RootAppsConfig;
}

const WORKSPACE_COMMANDS = new Set<WorkspaceCommand>([
	"build",
	"dev",
	"preview",
	"watch",
]);

const require = createRequire(import.meta.url);

async function getVitePlusSpawnConfig(args: string[]): Promise<{
	command: string;
	args: string[];
}> {
	// vite-plus exports its package.json but not its bin file
	const packagePath = require.resolve("vite-plus/package.json");
	const packageJson = JSON.parse(await fs.readFile(packagePath, "utf8")) as {
		bin: { vp: string };
	};

	return {
		command: process.execPath,
		args: [join(dirname(packagePath), packageJson.bin.vp), ...args],
	};
}

async function readRootPackageJson(): Promise<RootPackageJson> {
	const packagePath = resolvePath("package.json");
	const packageContent = await fs.readFile(packagePath, "utf8");
	return JSON.parse(packageContent) as RootPackageJson;
}

async function getWorkspaceApps(): Promise<Set<string>> {
	const appsPath = resolvePath("apps");
	const entries = await fs.readdir(appsPath, { withFileTypes: true });
	const apps = new Set<string>();

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}

		const packagePath = resolvePath("apps", entry.name, "package.json");
		const packageContent = await fs.readFile(packagePath, "utf8");
		const packageJson = JSON.parse(packageContent) as { name?: string };

		if (packageJson.name) {
			apps.add(packageJson.name);
		}
	}

	return apps;
}

async function getConfiguredApps(): Promise<string[]> {
	const packageJson = await readRootPackageJson();
	const appsConfig = packageJson.apps;

	if (Array.isArray(appsConfig)) {
		const apps = appsConfig
			.map((appName) => appName.trim())
			.filter(Boolean);

		if (apps.length === 0) {
			throw new Error(
				"Root package.json apps array cannot be empty after trimming values.",
			);
		}

		return Array.from(new Set(apps));
	}

	if (!appsConfig || typeof appsConfig !== "object") {
		throw new Error(
			"Root package.json must define apps as a non-empty array or object.",
		);
	}

	const apps = Object.entries(appsConfig)
		.filter(([, isEnabled]) => isEnabled === true || isEnabled === "true")
		.map(([appName]) => appName.trim())
		.filter(Boolean);

	if (apps.length === 0) {
		throw new Error(
			"Root package.json apps object must enable at least one app.",
		);
	}

	return Array.from(new Set(apps));
}

async function validateConfiguredApps(apps: string[]): Promise<void> {
	const workspaceApps = await getWorkspaceApps();
	const unknownApps = apps.filter((appName) => !workspaceApps.has(appName));

	if (unknownApps.length === 0) {
		return;
	}

	const knownApps = Array.from(workspaceApps).sort().join(", ");
	throw new Error(
		`Unknown apps in root package.json apps: ${
			unknownApps.join(", ")
		}. Known apps: ${knownApps}`,
	);
}

function normalizeOverrideApps(overrideApps: string[]): string[] {
	return Array.from(
		new Set(
			overrideApps
				.map((appName) => appName.trim())
				.filter(Boolean),
		),
	);
}

function parseWorkspaceArgs(
	args: string[],
	workspaceApps: Set<string>,
): {
	overrideApps: string[];
	passthroughArgs: string[];
} {
	const overrideApps: string[] = [];
	const passthroughArgs: string[] = [];
	let isPassthroughMode = false;

	for (const arg of args) {
		if (!arg) {
			continue;
		}

		if (isPassthroughMode) {
			passthroughArgs.push(arg);
			continue;
		}

		if (arg === "--") {
			isPassthroughMode = true;
			continue;
		}

		if (workspaceApps.has(arg)) {
			overrideApps.push(arg);
			continue;
		}

		if (arg.startsWith("-")) {
			passthroughArgs.push(arg);
			continue;
		}

		const knownApps = Array.from(workspaceApps).sort().join(", ");
		throw new Error(
			`Unknown workspace argument: ${arg}. Known apps: ${knownApps}.`,
		);
	}

	return {
		overrideApps: normalizeOverrideApps(overrideApps),
		passthroughArgs,
	};
}

function buildRunArgs(
	command: WorkspaceCommand,
	apps: string[],
	rootName: string,
	passthroughArgs: string[] = [],
): string[] {
	const isDev = command === "dev" || command === "watch";
	const filters = (isDev ? [rootName, ...apps] : apps).flatMap((name) => [
		"--filter",
		name,
	]);
	const task = `workspace:${isDev ? "dev" : command}`;

	return [
		"run",
		...(command === "build" ? [] : ["--parallel"]),
		...filters,
		...passthroughArgs,
		task,
	];
}

async function runVitePlus(args: string[]): Promise<void> {
	const vitePlusSpawn = await getVitePlusSpawnConfig(args);

	return new Promise((resolve, reject) => {
		const child = spawn(vitePlusSpawn.command, vitePlusSpawn.args, {
			cwd: resolvePath(),
			stdio: "inherit",
		});

		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(
				new Error(
					`Workspace command failed with exit code ${code ?? "unknown"}.`,
				),
			);
		});
	});
}

export async function run(
	inputCommand?: string,
	workspaceArgs: string[] = [],
): Promise<void> {
	if (
		!inputCommand || !WORKSPACE_COMMANDS.has(inputCommand as WorkspaceCommand)
	) {
		throw new Error(
			"Workspace command must be one of: dev, watch, build, preview.",
		);
	}

	const command = inputCommand as WorkspaceCommand;
	const workspaceApps = await getWorkspaceApps();
	const { overrideApps, passthroughArgs } = parseWorkspaceArgs(
		workspaceArgs,
		workspaceApps,
	);
	const explicitApps = normalizeOverrideApps(overrideApps);
	const apps = explicitApps.length > 0
		? explicitApps
		: await getConfiguredApps();
	await validateConfiguredApps(apps);
	const { name: rootName } = await readRootPackageJson();

	if (!rootName) {
		throw new Error(
			"Root package.json needs a name: the dev command runs its barrels watcher by it.",
		);
	}

	await runVitePlus(buildRunArgs(command, apps, rootName, passthroughArgs));
}
