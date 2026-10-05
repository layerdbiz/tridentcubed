// The `storybook` slice of packages/tools/src/config.ts, as it was when the
// stories generator was archived on #100 (2026-10-05). The live config.ts no
// longer has it. stories.ts and stories/typescript-analyzer.ts read it as
// TOOLS_CONFIG.packages.storybook.storiesPath.
export interface ToolsConfig {
	packages: {
		storybook: {
			storiesPath: string;
		};
	};
}

export const TOOLS_CONFIG: ToolsConfig = {
	packages: {
		storybook: {
			storiesPath: "apps/storybook/src/stories",
		},
	},
};
