import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';

// Vercel builds each project with `turbo run build` and deploys what the build leaves in `.vercel/output`.
// When nothing a build reads has changed, Turborepo skips it and puts back only the folders its task lists
// (turbo.json, `tasks.build.outputs`). With `.vercel/output` left out, a skipped build left nothing to
// deploy and Vercel failed it with `No Output Directory named "public" found` (2026-11-18).
const turbo = JSON.parse(
	readFileSync(fileURLToPath(new URL('../../../turbo.json', import.meta.url)), 'utf8')
) as { tasks: { build: { outputs: string[] } } };

describe('what a skipped build puts back', () => {
	it('includes the folder Vercel deploys', () => {
		expect(turbo.tasks.build.outputs).toContain('.vercel/output/**');
	});
});
