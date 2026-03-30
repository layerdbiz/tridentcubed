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
			componentsPath: string;
			staticPath: string;
		};
		storybook: {
			storiesPath: string;
			staticPath: string;
		};
		site: {
			staticPath: string;
		};
	};
	symlinks: {
		source: string;
		targets: string[];
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
			componentsPath: "packages/ui/src/lib/components",
			staticPath: "packages/ui/static",
		},
		storybook: {
			storiesPath: "apps/storybook/src/stories",
			staticPath: "apps/storybook/static",
		},
		site: {
			staticPath: "apps/site/static",
		},
	},
	symlinks: {
		source: "packages/ui/static",
		targets: [
			"apps/site/static",
			"apps/storybook/static",
		],
	},
	logging: {
		level: "info",
	},
};
