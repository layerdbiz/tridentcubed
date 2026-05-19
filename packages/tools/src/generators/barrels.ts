import { promises as fs } from "fs";
import chokidar from "chokidar";
import { TOOLS_CONFIG, type UiBarrelTargetConfig } from "../config.ts";
import {
	fileExists,
	type FileInfo,
	type FolderStructure,
	getWorkspaceApps,
	Logger,
	pascalCase,
	readFile,
	REGEX_PATTERNS,
	resolvePath,
	scanFolderStructure,
	writeFileAtomic,
} from "../utils.ts";

const logger = new Logger(TOOLS_CONFIG.logging.level);
const BARREL_LOCK_STALE_MS = 30_000;
const BARREL_LOCK_RETRY_MS = 50;
const BARREL_LOCK_MAX_ATTEMPTS = 200;

// Prevent concurrent runs
let isGenerating = false;
let pendingGeneration = false;

/**
 * Barrel-specific structure interface
 */
interface BarrelStructure {
	sections: Map<string, FileInfo[]>; // section name -> files
	categories: Map<string, Map<string, FileInfo[]>>; // section -> category -> files
}

type BarrelTargetMode = "app" | UiBarrelTargetConfig["kind"];

interface BarrelTarget {
	name: string;
	label: string;
	emoji: string;
	libPath: string;
	barrelFile: string;
	mode: BarrelTargetMode;
}

interface BarrelGenerationResult {
	target: BarrelTarget;
	content: string;
	totalFiles: number;
	sectionCount: number;
}

interface BarrelPlacement {
	section: string;
	category?: string;
}

function getBarrelFileTypeWeight(file: FileInfo): number {
	if (file.fileType === "ts") return 0;
	if (file.fileType === "svelte.ts") return 1;
	if (file.fileType === "svelte") return 2;
	return 3;
}

function compareBarrelFiles(a: FileInfo, b: FileInfo): number {
	const byName = a.name.localeCompare(b.name);
	if (byName !== 0) return byName;

	const byType = getBarrelFileTypeWeight(a) - getBarrelFileTypeWeight(b);
	if (byType !== 0) return byType;

	return a.relativePath.localeCompare(b.relativePath);
}

function getSectionHeader(target: BarrelTarget, sectionName: string): string {
	if (target.mode === "flat") {
		const label = target.label.replace(/^UI\s+/, "").trim();
		if (label) {
			return label;
		}
	}

	return sectionName.toUpperCase();
}

function getSectionFilePriority(
	target: BarrelTarget,
	sectionName: string,
	file: FileInfo,
): number {
	if (sectionName !== "base") {
		return 0;
	}

	if (target.mode === "ui-root") {
		return file.hierarchy[1] === "helpers" ? 1 : 0;
	}

	if (target.mode === "flat" && target.name === "ui-base") {
		return file.hierarchy[0] === "helpers" ? 1 : 0;
	}

	return 0;
}

function compareSectionFiles(
	target: BarrelTarget,
	sectionName: string,
	a: FileInfo,
	b: FileInfo,
): number {
	const priorityDelta = getSectionFilePriority(target, sectionName, a) -
		getSectionFilePriority(target, sectionName, b);

	if (priorityDelta !== 0) {
		return priorityDelta;
	}

	return compareBarrelFiles(a, b);
}

const UI_BARREL_TARGETS: BarrelTarget[] = TOOLS_CONFIG.packages.ui.barrelTargets
	.map((target) => ({
		name: target.name,
		label: target.label,
		emoji: "📦",
		libPath: target.libPath,
		barrelFile: target.barrelFile,
		mode: target.kind,
	}));

const UI_ROOT_BARREL_TARGET = UI_BARREL_TARGETS.find((target) =>
	target.mode === "ui-root"
);

async function getWorkspaceBarrelTargets(): Promise<BarrelTarget[]> {
	const apps = await getWorkspaceApps();
	const appTargets: BarrelTarget[] = [];

	for (const app of apps) {
		if (!(await fileExists(app.libPath))) {
			continue;
		}

		appTargets.push({
			name: app.packageName,
			label: app.packageName.toUpperCase(),
			emoji: "🚀",
			libPath: app.libPath,
			barrelFile: app.barrelFile,
			mode: "app",
		});
	}

	return [...UI_BARREL_TARGETS, ...appTargets];
}

function toWorkspacePath(path: string): string {
	return path.replace(/\\/g, "/").replace(/^([A-Za-z]:)?\//, "");
}

function getBarrelLockPath(filePath: string): string {
	const lockFileName = toWorkspacePath(filePath).replace(/[/:]/g, "__");
	return resolvePath(".turbo", "barrels-locks", `${lockFileName}.lock`);
}

function isIgnoredWatchPath(watchedPath: string): boolean {
	const normalizedPath = watchedPath.replace(/\\/g, "/");
	return normalizedPath.endsWith("/index.ts") ||
		normalizedPath.endsWith(".tmp") ||
		normalizedPath.endsWith(".lock");
}

function getSectionPriority(target: BarrelTarget, sectionName: string): number {
	const priorityOrder = (() => {
		switch (target.mode) {
			case "ui-root":
				return ["root", "base", "utils", "components"];
			case "app":
				return ["utils", "root", "components"];
			case "components":
				return ["components"];
			default:
				return ["root"];
		}
	})();

	const priority = priorityOrder.indexOf(sectionName);
	return priority === -1 ? priorityOrder.length : priority;
}

function compareBarrelSections(
	target: BarrelTarget,
	a: string,
	b: string,
): number {
	const priorityDelta = getSectionPriority(target, a) -
		getSectionPriority(target, b);

	if (priorityDelta !== 0) {
		return priorityDelta;
	}

	return a.localeCompare(b);
}

function resolveAppBarrelPlacement(hierarchyKey: string): BarrelPlacement {
	if (!hierarchyKey) {
		return { section: "root" };
	}

	const hierarchy = hierarchyKey.split(".");
	const section = hierarchy[0];

	if (section === "components") {
		return {
			section,
			category: hierarchy[1],
		};
	}

	if (section === "utils") {
		return { section };
	}

	return { section: "root" };
}

function resolveUiRootBarrelPlacement(hierarchyKey: string): BarrelPlacement {
	if (!hierarchyKey) {
		return { section: "root" };
	}

	const hierarchy = hierarchyKey.split(".");
	const section = hierarchy[0];

	if (section === "components") {
		return {
			section,
			category: hierarchy[1],
		};
	}

	if (section === "base" || section === "utils") {
		return { section };
	}

	return { section };
}

function resolveComponentsBarrelPlacement(
	hierarchyKey: string,
): BarrelPlacement {
	if (!hierarchyKey) {
		return { section: "components" };
	}

	const hierarchy = hierarchyKey.split(".");

	return {
		section: "components",
		category: hierarchy[0],
	};
}

function resolveBarrelPlacement(
	target: BarrelTarget,
	hierarchyKey: string,
): BarrelPlacement {
	switch (target.mode) {
		case "app":
			return resolveAppBarrelPlacement(hierarchyKey);
		case "ui-root":
			return resolveUiRootBarrelPlacement(hierarchyKey);
		case "components":
			return resolveComponentsBarrelPlacement(hierarchyKey);
		default:
			return { section: "root" };
	}
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireBarrelLock(
	filePath: string,
): Promise<() => Promise<void>> {
	const lockPath = getBarrelLockPath(filePath);
	await fs.mkdir(resolvePath(".turbo", "barrels-locks"), { recursive: true });

	for (let attempt = 0; attempt < BARREL_LOCK_MAX_ATTEMPTS; attempt += 1) {
		try {
			const handle = await fs.open(lockPath, "wx");
			await handle.writeFile(`${process.pid}`);

			return async () => {
				await handle.close();
				try {
					await fs.unlink(lockPath);
				} catch {
					// Ignore lock cleanup failures.
				}
			};
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
				throw error;
			}

			try {
				const stats = await fs.stat(lockPath);
				if (Date.now() - stats.mtimeMs > BARREL_LOCK_STALE_MS) {
					await fs.unlink(lockPath);
					continue;
				}
			} catch {
				continue;
			}

			await delay(BARREL_LOCK_RETRY_MS);
		}
	}

	throw new Error(`Timed out acquiring barrel lock for ${filePath}`);
}

/**
 * Convert universal FolderStructure to barrel-specific structure
 */
function convertToBarrelStructure(
	folderStructure: FolderStructure,
	target: BarrelTarget,
): BarrelStructure {
	const structure: BarrelStructure = {
		sections: new Map(),
		categories: new Map(),
	};

	logger.debug("Converting folder structure to barrel structure:");
	logger.debug(
		"Input folderStructure.files:",
		Array.from(folderStructure.files.keys()),
	);

	// Process files from the universal structure
	for (const [hierarchyKey, files] of folderStructure.files) {
		const { section, category } = resolveBarrelPlacement(target, hierarchyKey);

		logger.debug(
			`Processing hierarchy: ${hierarchyKey} -> section: ${section}, category: ${category}, files: ${files.length}`,
		);

		// Initialize section
		if (!structure.sections.has(section)) {
			structure.sections.set(section, []);
		}
		if (!structure.categories.has(section)) {
			structure.categories.set(section, new Map());
		}

		// Add files to section
		structure.sections.get(section)!.push(...files);

		// Add files to category if it exists
		if (category) {
			const sectionCategories = structure.categories.get(section)!;
			if (!sectionCategories.has(category)) {
				sectionCategories.set(category, []);
			}
			sectionCategories.get(category)!.push(...files);
		}
	}

	logger.debug(
		"Final barrel structure sections:",
		Array.from(structure.sections.keys()),
	);
	return structure;
}

/**
 * Generate barrel file content from barrel structure
 */
async function generateBarrelContent(
	structure: BarrelStructure,
	target: BarrelTarget,
): Promise<string> {
	const lines: string[] = [];

	const sortedSections = Array.from(structure.sections.keys()).sort((a, b) =>
		compareBarrelSections(target, a, b)
	);

	for (const sectionName of sortedSections) {
		const sectionFiles = structure.sections.get(sectionName) || [];
		const sectionCategories = structure.categories.get(sectionName) ||
			new Map();

		if (sectionFiles.length === 0) continue;

		// Add section header
		lines.push(`/* ${getSectionHeader(target, sectionName)} */`);

		// If we have categories in this section, organize by category
		if (sectionCategories.size > 0) {
			const categorizedFiles = new Set(
				Array.from(sectionCategories.values())
					.flat()
					.map((file) => file.path),
			);
			const uncategorizedFiles = sectionFiles.filter((file) =>
				!categorizedFiles.has(file.path)
			);

			for (
				const file of uncategorizedFiles.sort((a: FileInfo, b: FileInfo) =>
					compareSectionFiles(target, sectionName, a, b)
				)
			) {
				const fileExports = await generateFileExportsEnhanced(file);
				lines.push(...fileExports);
			}

			if (uncategorizedFiles.length > 0) {
				lines.push("");
			}

			const sortedCategories = Array.from(sectionCategories.keys()).sort();

			for (const categoryName of sortedCategories) {
				const categoryFiles = sectionCategories.get(categoryName) || [];
				if (categoryFiles.length === 0) continue;

				lines.push(`// ${categoryName}`);

				for (
					const file of categoryFiles.sort((a: FileInfo, b: FileInfo) =>
						compareSectionFiles(target, sectionName, a, b)
					)
				) {
					const fileExports = await generateFileExportsEnhanced(file);
					lines.push(...fileExports);
				}

				lines.push(""); // Empty line between categories
			}
		} else {
			// No categories, just list all files in section
			for (
				const file of sectionFiles.sort((a: FileInfo, b: FileInfo) =>
					compareSectionFiles(target, sectionName, a, b)
				)
			) {
				const fileExports = await generateFileExportsEnhanced(file);
				lines.push(...fileExports);
			}
			lines.push("");
		}
	}

	return lines.join("\n");
}

/**
 * Extract interface names from a Svelte file content
 */
async function extractInterfacesFromSvelte(
	filePath: string,
): Promise<string[]> {
	try {
		const content = await readFile(filePath);
		const interfaces: string[] = [];

		// Only look for exported interfaces - this prevents picking up internal/library interfaces
		const exportInterfacePattern = /export\s+interface\s+(\w+)/g;

		let match;

		// Find exported interfaces only
		while ((match = exportInterfacePattern.exec(content)) !== null) {
			const interfaceName = match[1];
			if (!interfaces.includes(interfaceName)) {
				interfaces.push(interfaceName);
				logger.debug(
					`Found exported interface: ${interfaceName} in ${filePath}`,
				);
			}
		}

		return interfaces;
	} catch (error) {
		logger.debug(
			`Failed to read file for interface extraction: ${filePath}`,
			error,
		);
		return [];
	}
}

/**
 * Generate export statements for a file
 */
function generateFileExports(file: FileInfo): string[] {
	const exportLines: string[] = [];
	const importPath = getImportPath(file);

	if (file.fileType === "svelte.ts" || file.fileType === "ts") {
		// For TypeScript files, export all
		exportLines.push(`export * from "${importPath}";`);
	} else if (file.fileType === "svelte") {
		// For Svelte files, export default with PascalCase name
		const exportName = pascalCase(file.name);
		exportLines.push(
			`export { default as ${exportName} } from "${importPath}";`,
		);
	}

	return exportLines;
}

/**
 * Check if a file should be exported as both default and named exports
 * This only applies when a .svelte.ts module actually provides a default export
 */
function shouldExportBoth(file: FileInfo): boolean {
	return file.fileType === "svelte.ts" && file.exportType === "default";
}

function getImportPath(file: FileInfo): string {
	const pathSegments = file.relativePath.split("/");
	const directory = pathSegments.slice(0, -1).join("/");
	const normalizedRelativePath = directory
		? `${directory}/${file.name}`
		: file.name;

	return `./${normalizedRelativePath}.${file.fileType}`;
}

/**
 * Generate export statements for a file with enhanced logic
 */
async function generateFileExportsEnhanced(file: FileInfo): Promise<string[]> {
	const exportLines: string[] = [];
	const importPath = getImportPath(file);

	if (file.fileType === "svelte.ts" || file.fileType === "ts") {
		// Check if we should export both default and named
		if (shouldExportBoth(file)) {
			const exportName = pascalCase(file.name);
			exportLines.push(
				`export { default as ${exportName} } from "${importPath}";`,
			);
			exportLines.push(`export * from "${importPath}";`);
		} else {
			// For TypeScript files, export all
			exportLines.push(`export * from "${importPath}";`);
		}
	} else if (file.fileType === "svelte") {
		// For Svelte files, check for interfaces and export both component and interfaces
		const exportName = pascalCase(file.name);
		const interfaces = await extractInterfacesFromSvelte(file.path);

		if (interfaces.length > 0) {
			// Export component and interfaces together
			const typeExports = interfaces.map((interfaceName) =>
				`type ${interfaceName}`
			).join(", ");
			exportLines.push(
				`export { default as ${exportName}, ${typeExports} } from "${importPath}";`,
			);
			logger.debug(
				`Enhanced export for ${file.name}: component + ${interfaces.length} interfaces`,
			);
		} else {
			// Export just the component (existing behavior)
			exportLines.push(
				`export { default as ${exportName} } from "${importPath}";`,
			);
		}
	}

	return exportLines;
}

async function buildBarrelTarget(
	target: BarrelTarget,
): Promise<
	| BarrelGenerationResult
	| null
> {
	const libPath = resolvePath(target.libPath);

	if (!(await fileExists(libPath))) {
		logger.debug(
			`Skipping ${target.name} barrel target: missing lib path ${libPath}`,
		);
		return null;
	}

	const folderStructure = await scanFolderStructure(libPath, {
		includeFileTypes: [".svelte", ".ts", ".svelte.ts"],
		excludePatterns: [
			REGEX_PATTERNS.testFiles,
			REGEX_PATTERNS.barrelFiles,
			REGEX_PATTERNS.backupFiles,
			REGEX_PATTERNS.serverEntries,
			REGEX_PATTERNS.configFiles,
		],
	});

	const barrelStructure = convertToBarrelStructure(folderStructure, target);
	const totalFiles = Array.from(barrelStructure.sections.values())
		.reduce((sum, files) => sum + files.length, 0);

	if (totalFiles === 0) {
		logger.debug(`Skipping ${target.name} barrel: no exportable files found.`);
		return null;
	}

	return {
		target,
		content: await generateBarrelContent(barrelStructure, target),
		totalFiles,
		sectionCount: barrelStructure.sections.size,
	};
}

async function writeBarrelTarget(target: BarrelTarget): Promise<boolean> {
	const barrelFile = resolvePath(target.barrelFile);
	const result = await buildBarrelTarget(target);

	if (!result) {
		return false;
	}

	const releaseLock = await acquireBarrelLock(barrelFile);

	try {
		const content = result.content.endsWith("\n")
			? result.content
			: `${result.content}\n`;

		const existingContent = await fileExists(barrelFile)
			? await readFile(barrelFile)
			: null;

		if (existingContent === content) {
			return false;
		}

		await writeFileAtomic(barrelFile, content);

		const groupLabel = result.sectionCount === 1 ? "group" : "groups";
		logger.infoRaw(
			`${target.emoji} ${target.label}: updated ${result.totalFiles} exports across ${result.sectionCount} ${groupLabel}`,
		);

		return true;
	} finally {
		await releaseLock();
	}
}

async function generateWorkspaceBarrels(): Promise<void> {
	let updatedTargets = 0;
	const targets = await getWorkspaceBarrelTargets();

	for (const target of targets) {
		const wasUpdated = await writeBarrelTarget(target);
		if (wasUpdated) {
			updatedTargets += 1;
		}
	}
}

async function runWorkspaceGeneration(): Promise<void> {
	if (isGenerating) {
		pendingGeneration = true;
		return;
	}

	isGenerating = true;

	try {
		await generateWorkspaceBarrels();
	} finally {
		isGenerating = false;
		if (pendingGeneration) {
			pendingGeneration = false;
			await runWorkspaceGeneration();
		}
	}
}

async function watchWorkspaceBarrels(): Promise<void> {
	await runWorkspaceGeneration();

	const watchPaths = [
		resolvePath(TOOLS_CONFIG.packages.ui.libPath),
		resolvePath("apps/*/src/lib"),
	];

	const watcher = chokidar.watch(watchPaths, {
		ignoreInitial: true,
		awaitWriteFinish: {
			stabilityThreshold: 100,
			pollInterval: 50,
		},
		ignored: isIgnoredWatchPath,
	});

	let scheduledRun: NodeJS.Timeout | null = null;
	const scheduleGeneration = (eventName: string, watchedPath: string) => {
		if (isIgnoredWatchPath(watchedPath)) {
			return;
		}

		if (scheduledRun) {
			clearTimeout(scheduledRun);
		}

		scheduledRun = setTimeout(() => {
			scheduledRun = null;
			void runWorkspaceGeneration();
		}, 50);
	};

	watcher
		.on("add", (watchedPath) => scheduleGeneration("add", watchedPath))
		.on("change", (watchedPath) => scheduleGeneration("change", watchedPath))
		.on("unlink", (watchedPath) => scheduleGeneration("unlink", watchedPath))
		.on("addDir", (watchedPath) => scheduleGeneration("addDir", watchedPath))
		.on(
			"unlinkDir",
			(watchedPath) => scheduleGeneration("unlinkDir", watchedPath),
		)
		.on("error", (error) => {
			logger.error("Workspace barrel watcher failed:", error);
		});

	logger.info("Watching workspace lib folders for barrel changes...");

	await new Promise(() => {});
}

/**
 * Generate barrel file for UI library using dynamic structure discovery
 */
export async function generateBarrel(): Promise<void> {
	// Prevent concurrent runs
	if (isGenerating) {
		logger.debug("Barrel generation already in progress, skipping...");
		return;
	}

	if (!UI_ROOT_BARREL_TARGET) {
		throw new Error("Missing UI root barrel target configuration.");
	}

	isGenerating = true;

	try {
		await writeBarrelTarget(UI_ROOT_BARREL_TARGET);
	} catch (error) {
		logger.error("Failed to generate barrel file:", error);
		throw error;
	} finally {
		isGenerating = false;
	}
}

/**
 * Run barrel generation (main entry point)
 */
export async function run(): Promise<void> {
	const shouldWatch = process.argv.includes("--watch");

	if (shouldWatch) {
		await watchWorkspaceBarrels();
		return;
	}

	if (process.argv.includes("--workspace")) {
		await generateWorkspaceBarrels();
		return;
	}

	await generateBarrel();
}
