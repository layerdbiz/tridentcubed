/**
 * The help check (Justin, 2026-11-28: "Every input that we have, anytime that we have data that can be entered in
 * by a user, there has to be a help icon next to it"): every library `Input`, `Textarea` and `Select` the app
 * renders carries a `help`, which draws the ? beside its label. In the app that is `help={look.helpOf('<key>')}`,
 * the text an Admin can change, with its first draft in apps/app/src/lib/start/help.ts; before sign-in, where there
 * is no look, it is the text itself.
 *
 * It reads each .svelte file under apps/app/src that imports one of them from @layerd/ui, finds every opening tag
 * of one, and asks for a `help` attribute on it: `help={...}`, `help="..."` or `{help}`. A spread (`{...props}`) does
 * not count, since the check cannot see into it. There is no list of exceptions: a field with nothing to explain
 * still says what it is for.
 *
 * Modes: with file paths (the pre-commit hook passes the staged ones), it checks those; with none, every app file
 * (`pnpm check`).
 */

import { existsSync, globSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const APP = resolve(ROOT, "apps/app/src");

/** The library's entries that take a `help`. */
export const ENTRIES = ["Input", "Textarea", "Select"] as const;

const IMPORT = /import\s*\{([^}]*)\}\s*from\s*["']@layerd\/ui["']/g;

/** The library entries a file imports from @layerd/ui, by the name it uses for each. */
export function toImported(source: string): string[] {
	const names: string[] = [];
	for (const match of source.matchAll(IMPORT)) {
		for (const part of match[1].split(",")) {
			const [name, as] = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/);
			if ((ENTRIES as readonly string[]).includes(name)) names.push(as ?? name);
		}
	}
	return names;
}

/**
 * An opening tag's text at its top level: what sits outside `{...}` and quotes, with each `{...}` at the top kept
 * as its inside, so `{help}` and `{...props}` can be told apart. Ends at the tag's own `>`.
 */
function readTag(source: string, from: number): { top: string[]; end: number } {
	const top: string[] = [];
	let depth = 0;
	let quote = "";
	let group = "";
	let text = "";
	for (let at = from; at < source.length; at += 1) {
		const char = source[at];
		if (quote) {
			if (char === quote && source[at - 1] !== "\\") quote = "";
			if (depth) group += char;
			continue;
		}
		// A comment inside an expression, whose words may hold a quote mark ("the customer's").
		if (depth && char === "/" && (source[at + 1] === "/" || source[at + 1] === "*")) {
			const close = source[at + 1] === "/" ? "\n" : "*/";
			const until = source.indexOf(close, at + 2);
			at = until < 0 ? source.length : until + close.length - 1;
			continue;
		}
		if (char === '"' || char === "'" || char === "`") {
			quote = char;
			if (depth) group += char;
			continue;
		}
		if (char === "{") {
			if (depth) group += char;
			depth += 1;
			continue;
		}
		if (char === "}") {
			depth -= 1;
			if (depth) group += char;
			else {
				top.push(`{${group.trim()}}`);
				group = "";
			}
			continue;
		}
		if (depth) {
			group += char;
			continue;
		}
		if (char === ">") {
			top.push(text);
			return { top, end: at };
		}
		text += char;
	}
	top.push(text);
	return { top, end: source.length };
}

/** Whether an opening tag's top-level text gives it a `help`. */
export function hasHelp(top: string[]): boolean {
	return top.some((part) => part === "{help}" || /(?:^|\s)help\s*=/.test(part));
}

/** Every entry in a file's markup that has no `help`: its name and line. */
export function toMissing(source: string): { name: string; line: number }[] {
	const names = toImported(source);
	if (!names.length) return [];
	// Only the markup: the script blocks hold no tags.
	const markup = source.replace(/<script[\s\S]*?<\/script>/g, (block) => block.replace(/[^\n]/g, " "));
	const tag = new RegExp(`<(${names.join("|")})(?=[\\s/>])`, "g");
	const missing: { name: string; line: number }[] = [];
	for (const match of markup.matchAll(tag)) {
		const { top } = readTag(markup, match.index + match[0].length);
		if (!hasHelp(top)) {
			missing.push({ name: match[1], line: markup.slice(0, match.index).split("\n").length });
		}
	}
	return missing;
}

function isAppFile(path: string): boolean {
	const name = relative(APP, path);
	return !name.startsWith("..") && name.endsWith(".svelte");
}

function allFiles(): string[] {
	return globSync("**/*.svelte", { cwd: APP }).map((name) => resolve(APP, name));
}

export function run(args = process.argv.slice(2)): void {
	const paths = args.length ? args.map((path) => resolve(path)).filter(isAppFile) : allFiles();
	let failures = 0;
	for (const path of paths) {
		if (!existsSync(path)) continue;
		for (const { name, line } of toMissing(readFileSync(path, "utf8"))) {
			console.error(`help: ${relative(ROOT, path)}:${line} <${name}> has no help`);
			failures += 1;
		}
	}
	if (failures) {
		console.error(
			"help: every Input, Textarea and Select in the app shows a help ?: give it help={look.helpOf('<key>')} and its text in apps/app/src/lib/start/help.ts (apps/app/AGENTS.md).",
		);
		process.exitCode = 1;
	}
}
