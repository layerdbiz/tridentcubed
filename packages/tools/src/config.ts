export interface UiBarrelTargetConfig {
	name: string;
	label: string;
	libPath: string;
	barrelFile: string;
	kind: "ui-root" | "flat" | "components";
}

export interface ToolsConfig {
	packages: {
		app: {
			dataPath: string;
			sheetari: {
				baseUrl: string;
				sheetId: string;
				endpoints: {
					inputs: string;
					panels: string;
					pages: string;
					instructions: string;
				};
				files: {
					config: string;
					inputs: string;
					panels: string;
					pages: string;
					instructions: string;
				};
			};
		};
		ui: {
			srcPath: string;
			libPath: string;
			barrelFile: string;
			barrelTargets: UiBarrelTargetConfig[];
			componentsPath: string;
			staticPath: string;
		};
		storybook: {
			storiesPath: string;
		};
	};
	symlinks: {
		source: string;
	};
	logging: {
		level: "debug" | "info" | "warn" | "error";
	};
}

export const TOOLS_CONFIG: ToolsConfig = {
	packages: {
		app: {
			dataPath: "apps/app/src/lib/data",
			sheetari: {
				baseUrl: "https://sheetari.deno.dev",
				sheetId: "1oLakDXDeEINBs0B3KSkcyM1131YnuHtAKEk6l7ClT8k",
				endpoints: {
					inputs: "inputs?range=b1:u",
					panels: "panels",
					pages: "pages",
					instructions: "instructions",
				},
				files: {
					config: "config.json",
					inputs: "inputs.json",
					panels: "panels.json",
					pages: "pages.json",
					instructions: "instructions.json",
				},
			},
		},
		ui: {
			srcPath: "packages/ui/src",
			libPath: "packages/ui/src/lib",
			barrelFile: "packages/ui/src/lib/index.ts",
			barrelTargets: [
				{
					name: "ui",
					label: "UI",
					libPath: "packages/ui/src/lib",
					barrelFile: "packages/ui/src/lib/index.ts",
					kind: "ui-root",
				},
				{
					name: "ui-base",
					label: "UI BASE",
					libPath: "packages/ui/src/lib/base",
					barrelFile: "packages/ui/src/lib/base/index.ts",
					kind: "flat",
				},
				{
					name: "ui-helpers",
					label: "UI HELPERS",
					libPath: "packages/ui/src/lib/base/helpers",
					barrelFile: "packages/ui/src/lib/base/helpers/index.ts",
					kind: "flat",
				},
				{
					name: "ui-utils",
					label: "UI UTILS",
					libPath: "packages/ui/src/lib/utils",
					barrelFile: "packages/ui/src/lib/utils/index.ts",
					kind: "flat",
				},
				{
					name: "ui-components",
					label: "UI COMPONENTS",
					libPath: "packages/ui/src/lib/components",
					barrelFile: "packages/ui/src/lib/components/index.ts",
					kind: "components",
				},
			],
			componentsPath: "packages/ui/src/lib/components",
			staticPath: "packages/ui/static",
		},
		storybook: {
			storiesPath: "apps/storybook/src/stories",
		},
	},
	symlinks: {
		source: "packages/ui/static",
	},
	logging: {
		level: "info",
	},
};
