import { spawn } from "child_process";
import { promises as fs } from "fs";
import { createRequire } from "module";
import { resolvePath } from "../utils.ts";

type WorkspaceCommand = "build" | "dev" | "preview" | "watch";
type RootAppsConfig =
	| string[]
	| Record<string, boolean | "true" | "false">;

interface RootPackageJson {
	apps?: RootAppsConfig;
}

const WORKSPACE_COMMANDS = new Set<WorkspaceCommand>([
	"build",
	"dev",
	"preview",
	"watch",
]);

const require = createRequire(import.meta.url);

function getTurboSpawnConfig(args: string[]): {
	command: string;
	args: string[];
} {
	const turboBinPath = require.resolve("turbo/bin/turbo");

	return {
		command: process.execPath,
		args: [turboBinPath, ...args],
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

function buildTurboArgs(
	command: WorkspaceCommand,
	apps: string[],
	passthroughArgs: string[] = [],
): string[] {
	const turboArgs = (() => {
		if (command === "watch") {
			return [
				"watch",
				"//#barrels:watch",
				...apps.map((appName) => `${appName}#dev`),
				"storybook#story",
			];
		}

		if (command === "dev") {
			return [
				"watch",
				"//#barrels:watch",
				...apps.map((appName) => `${appName}#dev`),
			];
		}

		return [
			"run",
			...apps.map((appName) => `${appName}#${command}`),
		];
	})();

	if (passthroughArgs.length > 0) {
		turboArgs.push("--", ...passthroughArgs);
	}

	return turboArgs;
}

function runTurbo(args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const turboSpawn = getTurboSpawnConfig(args);
		const child = spawn(turboSpawn.command, turboSpawn.args, {
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
	await runTurbo(buildTurboArgs(command, apps, passthroughArgs));
}
