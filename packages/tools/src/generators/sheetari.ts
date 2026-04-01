import { resolve as resolveFilePath } from "node:path";
import { TOOLS_CONFIG } from "../config.ts";
import { Logger, resolvePath, writeFileAtomic } from "../utils.ts";

const logger = new Logger(TOOLS_CONFIG.logging.level);

type SheetariEndpointName =
	keyof typeof TOOLS_CONFIG.packages.app.sheetari.endpoints;
type SheetariFileName = Exclude<
	keyof typeof TOOLS_CONFIG.packages.app.sheetari.files,
	"config"
>;

interface SheetariSnapshotFile {
	fileName: string;
	sourceUrl: string;
	content: string;
	itemCount: number | null;
	type: "array" | "object" | "primitive";
}

interface SheetariSnapshotConfig {
	baseUrl: string;
	sheetId: string;
	fetchedAt: string;
	outputDirectory: string;
	files: typeof TOOLS_CONFIG.packages.app.sheetari.files;
	sources: Record<SheetariEndpointName, {
		file: string;
		url: string;
		type: "array" | "object" | "primitive";
		itemCount: number | null;
	}>;
}

function getSourceUrl(endpoint: SheetariEndpointName): string {
	const { baseUrl, sheetId, endpoints } = TOOLS_CONFIG.packages.app.sheetari;
	return `${baseUrl}/${sheetId}/${endpoints[endpoint]}`;
}

function classifyJsonValue(value: unknown): "array" | "object" | "primitive" {
	if (Array.isArray(value)) return "array";
	if (typeof value === "object" && value !== null) return "object";
	return "primitive";
}

function stableJsonValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => stableJsonValue(entry));
	}

	if (typeof value === "object" && value !== null) {
		const record = value as Record<string, unknown>;
		return Object.fromEntries(
			Object.entries(record).map(([key, entry]) => [
				key,
				stableJsonValue(entry),
			]),
		);
	}

	return value;
}

function stringifyStableJson(value: unknown): string {
	return `${JSON.stringify(stableJsonValue(value), null, 2)}\n`;
}

async function fetchSnapshot(
	endpoint: SheetariEndpointName,
	fileName: string,
): Promise<SheetariSnapshotFile> {
	const sourceUrl = getSourceUrl(endpoint);
	logger.info(`Fetching ${endpoint} from ${sourceUrl}`);

	const response = await fetch(sourceUrl, {
		headers: {
			accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`,
		);
	}

	const payload = await response.json();
	const type = classifyJsonValue(payload);
	const itemCount = Array.isArray(payload) ? payload.length : null;
	const content = stringifyStableJson(payload);

	return {
		fileName,
		sourceUrl,
		content,
		itemCount,
		type,
	};
}

export async function buildSheetariSnapshot(): Promise<{
	configContent: string;
	dataFiles: Record<SheetariFileName, SheetariSnapshotFile>;
}> {
	const { files } = TOOLS_CONFIG.packages.app.sheetari;
	const fetchedAt = new Date().toISOString();

	const [inputs, panels, pages, instructions] = await Promise.all([
		fetchSnapshot("inputs", files.inputs),
		fetchSnapshot("panels", files.panels),
		fetchSnapshot("pages", files.pages),
		fetchSnapshot("instructions", files.instructions),
	]);

	const dataFiles = {
		inputs,
		panels,
		pages,
		instructions,
	};

	const config: SheetariSnapshotConfig = {
		baseUrl: TOOLS_CONFIG.packages.app.sheetari.baseUrl,
		sheetId: TOOLS_CONFIG.packages.app.sheetari.sheetId,
		fetchedAt,
		outputDirectory: TOOLS_CONFIG.packages.app.dataPath,
		files: TOOLS_CONFIG.packages.app.sheetari.files,
		sources: {
			inputs: {
				file: files.inputs,
				url: inputs.sourceUrl,
				type: inputs.type,
				itemCount: inputs.itemCount,
			},
			panels: {
				file: files.panels,
				url: panels.sourceUrl,
				type: panels.type,
				itemCount: panels.itemCount,
			},
			pages: {
				file: files.pages,
				url: pages.sourceUrl,
				type: pages.type,
				itemCount: pages.itemCount,
			},
			instructions: {
				file: files.instructions,
				url: instructions.sourceUrl,
				type: instructions.type,
				itemCount: instructions.itemCount,
			},
		},
	};

	return {
		configContent: stringifyStableJson(config),
		dataFiles,
	};
}

export async function syncSheetari(): Promise<void> {
	const outputDirectory = resolvePath(TOOLS_CONFIG.packages.app.dataPath);
	const { files } = TOOLS_CONFIG.packages.app.sheetari;

	logger.info(`Building Sheetari snapshot in ${outputDirectory}`);

	const { configContent, dataFiles } = await buildSheetariSnapshot();

	const writeTargets = [
		...Object.values(dataFiles).map((entry) => ({
			filePath: resolveFilePath(outputDirectory, entry.fileName),
			content: entry.content,
		})),
		{
			filePath: resolveFilePath(outputDirectory, files.config),
			content: configContent,
		},
	];

	for (const target of writeTargets) {
		await writeFileAtomic(target.filePath, target.content);
	}

	logger.info(
		`Sheetari snapshot updated: ${writeTargets.length} files written to ${outputDirectory}`,
	);
}

export async function run(): Promise<void> {
	await syncSheetari();
}
