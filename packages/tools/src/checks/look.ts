/**
 * The look check (Justin, 2026-11-26): every @layerd/ui component is built on the base component, as the Button is,
 * and takes its look from outside: `color`, `appearance`, `size`, their shorthands and `class`, with the theme
 * supplying the colours. A component that draws itself in fixed palette colours (slate, gray, white...) cannot be
 * reused, and one that skips the base component loses what the base gives every component.
 *
 * It reads each component file under packages/ui/src/lib/components and finds two things: whether it renders
 * `<Component`, and how many palette colours it names (`bg-slate-200`, `ring-white`, `--color-gray-500`). The ones
 * that broke the rule before the check existed are listed in packages/ui/look.json with what they had then; such a
 * file may get better, never worse. A file not listed must be on the base component and name no palette colour.
 * Adding a file to that list needs Justin's yes, written in its `yes` with his name and the date.
 *
 * Modes: with file paths (the pre-commit hook passes the staged ones), it checks those; with none, every component
 * file (`pnpm check`); `--lower` writes the list again with what each listed file has now, where that is better,
 * and drops a file that now keeps the rule. It never adds a file or raises a count.
 */

import { readFileSync, writeFileSync, globSync, existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const LIB = resolve(ROOT, "packages/ui/src/lib");
const LIST = resolve(ROOT, "packages/ui/look.json");

const HUES =
	"slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTILITIES =
	"bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|divide|placeholder|caret|accent|decoration|shadow|inset-shadow|drop-shadow";
// `bg-slate-200`, `hover:text-gray-500/50`, `ring-white`, `var(--color-slate-400)`. The theme's own colours (base,
// neutral, primary, secondary, accent, info, success, warning, danger, surface) are not palette colours.
const PALETTE = new RegExp(
	`(?<![\\w-])(?:${UTILITIES})-(?:(?:${HUES})-\\d{2,3}|white|black)(?![\\w-])|--color-(?:${HUES}|white|black)\\b`,
	"g",
);
const BASE = /<Component[\s>]/;

export interface LookType {
	/** Whether it renders the base component. */
	base: boolean;
	/** How many palette colours it names. */
	colours: number;
}

interface ListedType extends LookType {
	/** Justin's yes for a deliberate exception: his name, the date and why. */
	yes?: string;
}

interface ListType {
	about: string;
	files: Record<string, ListedType>;
}

/** What one component file has. */
export function toLook(source: string): LookType {
	return { base: BASE.test(source), colours: (source.match(PALETTE) ?? []).length };
}

/** What a file breaks, against what it was listed with (if it was): one line each. */
export function toProblems(look: LookType, listed?: LookType): string[] {
	const problems: string[] = [];
	const isBaseAllowed = listed ? !listed.base : false;
	const allowedColours = listed?.colours ?? 0;
	if (!look.base && !isBaseAllowed)
		problems.push("is not built on the base component: render <Component {...props}> as the Button does");
	if (look.colours > allowedColours)
		problems.push(
			`names ${look.colours} palette colour${look.colours === 1 ? "" : "s"} (allowed ${allowedColours}): take the look from color/appearance/class and theme colours`,
		);
	return problems;
}

function isComponentFile(path: string): boolean {
	const name = relative(LIB, path);
	return name.startsWith("components/") && name.endsWith(".svelte");
}

function readList(): ListType {
	return existsSync(LIST)
		? (JSON.parse(readFileSync(LIST, "utf8")) as ListType)
		: { about: "", files: {} };
}

function allFiles(): string[] {
	return globSync("components/**/*.svelte", { cwd: LIB }).map((name) => resolve(LIB, name));
}

function lower(list: ListType): void {
	const files: Record<string, ListedType> = {};
	for (const [name, listed] of Object.entries(list.files)) {
		const path = resolve(LIB, name);
		if (!existsSync(path)) continue;
		const look = toLook(readFileSync(path, "utf8"));
		const base = listed.base || look.base;
		const colours = Math.min(listed.colours, look.colours);
		if (base && colours === 0) continue;
		files[name] = { ...listed, base, colours };
	}
	writeFileSync(LIST, `${JSON.stringify({ ...list, files }, null, "\t")}\n`);
	console.log(`look: ${Object.keys(list.files).length - Object.keys(files).length} file(s) left the list`);
}

export function run(args = process.argv.slice(2)): void {
	const list = readList();
	if (args.includes("--lower")) return lower(list);
	const paths = args.length ? args.map((path) => resolve(path)).filter(isComponentFile) : allFiles();
	let failures = 0;
	for (const path of paths) {
		if (!existsSync(path)) continue;
		const name = relative(LIB, path);
		const problems = toProblems(toLook(readFileSync(path, "utf8")), list.files[name]);
		for (const problem of problems) console.error(`look: packages/ui/src/lib/${name} ${problem}`);
		failures += problems.length;
	}
	if (failures) {
		console.error(
			"look: every @layerd/ui component is built on the base component and takes its look from outside (CODING_STANDARDS.md).",
		);
		process.exitCode = 1;
	}
}
