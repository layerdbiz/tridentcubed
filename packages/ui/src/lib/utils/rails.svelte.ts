export interface RailDefinition {
	column: string;
	aliases?: string[];
	inset?: string;
}

export interface RailDebugLine {
	key: string;
	label?: string;
	kind: "named" | "inset";
	side: "start" | "center" | "end";
	line?: string;
	inset?: string;
}

export interface InsetResolution {
	label: string;
	value: string;
}

export const insetValues: Record<string, string> = {
	xs: "var(--rail-inset-xs, 0.25rem)",
	sm: "var(--rail-inset-sm, 0.5rem)",
	md: "var(--rail-inset-md, 1rem)",
	lg: "var(--rail-inset-lg, 2rem)",
	xl: "var(--rail-inset-xl, clamp(2.5rem, 6vw, 4rem))",
	xxl: "var(--rail-inset-xxl, 4rem)",
};

const insetValueAliases: Record<string, string> = {
	"1": "xs",
	"2": "sm",
	"3": "md",
	"4": "lg",
	"5": "xl",
	"6": "xxl",
};

/**
 * Canonical rail definitions are the source of truth for spans, alias
 * normalization, short-name-first authoring, and reusable inset presets.
 */
export const canonicalRails: Record<string, RailDefinition> = {
	xs: {
		column: "content-xs-start / content-xs-end",
		aliases: ["content-xs"],
	},
	sm: {
		column: "content-sm-start / content-sm-end",
		aliases: ["content-sm"],
	},
	content: {
		column: "content-md-start / content-md-end",
		aliases: ["md", "content-md"],
	},
	lg: {
		column: "content-lg-start / content-lg-end",
		aliases: ["content-lg", "popout"],
	},
	xl: {
		column: "content-xl-start / content-xl-end",
		aliases: ["content-xl"],
	},
	xxl: {
		column: "content-xxl-start / content-xxl-end",
		aliases: ["content-xxl"],
	},
	full: {
		column: "content-full-start / content-full-end",
		aliases: ["content-full", "bleed"],
	},
	"gutter-xs": {
		column: "content-full-start / content-full-end",
		aliases: ["gutter-1", "inset-xs", "full-inset-xs"],
		inset: "xs",
	},
	"gutter-sm": {
		column: "content-full-start / content-full-end",
		aliases: ["gutter-2", "inset-sm", "full-inset-sm"],
		inset: "sm",
	},
	"gutter-md": {
		column: "content-full-start / content-full-end",
		aliases: ["gutter", "gutter-3", "inset-md", "full-inset-md"],
		inset: "md",
	},
	"gutter-lg": {
		column: "content-full-start / content-full-end",
		aliases: ["gutter-4", "inset-lg", "full-inset-lg"],
		inset: "lg",
	},
	"gutter-xl": {
		column: "content-full-start / content-full-end",
		aliases: ["gutter-5", "inset-xl", "full-inset-xl"],
		inset: "xl",
	},
	"gutter-xxl": {
		column: "content-full-start / content-full-end",
		aliases: ["gutter-6", "inset-xxl", "full-inset-xxl"],
		inset: "xxl",
	},
	left: {
		column: "content-full-start / content-center",
		aliases: ["bleed-left", "bleed-left-center", "bleed-left-half"],
	},
	right: {
		column: "content-center / content-full-end",
		aliases: ["bleed-right", "bleed-right-center", "bleed-right-half"],
	},
	"left-xs": {
		column: "content-full-start / content-xs-end",
		aliases: ["bleed-left-xs"],
	},
	"left-sm": {
		column: "content-full-start / content-sm-end",
		aliases: ["bleed-left-sm"],
	},
	"left-content": {
		column: "content-full-start / content-md-end",
		aliases: ["left-md", "bleed-left-md"],
	},
	"left-lg": {
		column: "content-full-start / content-lg-end",
		aliases: ["bleed-left-lg"],
	},
	"left-xl": {
		column: "content-full-start / content-xl-end",
		aliases: ["bleed-left-xl"],
	},
	"left-xxl": {
		column: "content-full-start / content-xxl-end",
	},
	"right-xs": {
		column: "content-xs-start / content-full-end",
		aliases: ["bleed-right-xs"],
	},
	"right-sm": {
		column: "content-sm-start / content-full-end",
		aliases: ["bleed-right-sm"],
	},
	"right-content": {
		column: "content-md-start / content-full-end",
		aliases: ["right-md", "bleed-right-md"],
	},
	"right-lg": {
		column: "content-lg-start / content-full-end",
		aliases: ["bleed-right-lg"],
	},
	"right-xl": {
		column: "content-xl-start / content-full-end",
		aliases: ["bleed-right-xl"],
	},
	"right-xxl": {
		column: "content-xxl-start / content-full-end",
	},
};

const defaultRailDebugLines: RailDebugLine[] = [
	{
		key: "content-full-start",
		label: "full",
		kind: "named",
		side: "start",
		line: "content-full-start",
	},
	{
		key: "content-xxl-start",
		label: "xxl",
		kind: "named",
		side: "start",
		line: "content-xxl-start",
	},
	{
		key: "content-xl-start",
		label: "xl",
		kind: "named",
		side: "start",
		line: "content-xl-start",
	},
	{
		key: "content-lg-start",
		label: "lg",
		kind: "named",
		side: "start",
		line: "content-lg-start",
	},
	{
		key: "content-md-start",
		label: "content",
		kind: "named",
		side: "start",
		line: "content-md-start",
	},
	{
		key: "content-sm-start",
		label: "sm",
		kind: "named",
		side: "start",
		line: "content-sm-start",
	},
	{
		key: "content-xs-start",
		label: "xs",
		kind: "named",
		side: "start",
		line: "content-xs-start",
	},
	{
		key: "content-center",
		kind: "named",
		side: "center",
		line: "content-center",
	},
	{
		key: "content-xs-end",
		label: "xs",
		kind: "named",
		side: "end",
		line: "content-xs-end",
	},
	{
		key: "content-sm-end",
		label: "sm",
		kind: "named",
		side: "end",
		line: "content-sm-end",
	},
	{
		key: "content-md-end",
		label: "content",
		kind: "named",
		side: "end",
		line: "content-md-end",
	},
	{
		key: "content-lg-end",
		label: "lg",
		kind: "named",
		side: "end",
		line: "content-lg-end",
	},
	{
		key: "content-xl-end",
		label: "xl",
		kind: "named",
		side: "end",
		line: "content-xl-end",
	},
	{
		key: "content-xxl-end",
		label: "xxl",
		kind: "named",
		side: "end",
		line: "content-xxl-end",
	},
	{
		key: "content-full-end",
		label: "full",
		kind: "named",
		side: "end",
		line: "content-full-end",
	},
];

function createRailAliasMap(): Record<string, string> {
	const aliases: Record<string, string> = {};

	for (const [canonical, definition] of Object.entries(canonicalRails)) {
		aliases[canonical] = canonical;
		for (const alias of definition.aliases ?? []) {
			aliases[toRailKey(alias)] = canonical;
		}
	}

	return aliases;
}

function createRailSpanMap(): Record<string, string> {
	const spans: Record<string, string> = {};

	for (const [canonical, definition] of Object.entries(canonicalRails)) {
		spans[canonical] = definition.column;
		for (const alias of definition.aliases ?? []) {
			spans[toRailKey(alias)] = definition.column;
		}
	}

	return spans;
}

export const railAliases: Record<string, string> = createRailAliasMap();

export const railSpans: Record<string, string> = createRailSpanMap();

export function toRailKey(value: unknown): string {
	return String(value)
		.trim()
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.toLowerCase()
		.replace(/[_\s]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function normalizeInset(value: unknown): string {
	return String(value ?? "").trim();
}

export function toInsetToken(value: unknown): string {
	const raw = toRailKey(value).replace(/^(?:gutter|(?:full-)?inset)-/, "");
	const token = insetValues[raw] ? raw : insetValueAliases[raw] ?? "";
	return insetValues[token] ? token : "";
}

export function resolveInset(value: unknown): InsetResolution | undefined {
	const raw = normalizeInset(value);
	if (!raw) return undefined;

	const token = toInsetToken(raw);
	if (token) {
		return {
			label: `inset-${token}`,
			value: insetValues[token],
		};
	}

	return {
		label: "inset",
		value: raw,
	};
}

export function normalizeRail(value: unknown): string {
	const raw = toRailKey(value);
	if (!raw) return "";
	return railAliases[raw] ?? "";
}

export function getRailDefinition(value: unknown): RailDefinition | undefined {
	const railKey = normalizeRail(value);
	return railKey ? canonicalRails[railKey] : undefined;
}

export function getRailColumn(value: unknown): string | undefined {
	return getRailDefinition(value)?.column;
}

/**
	* Gutter rails expose preset spacing through the canonical definition, while
	* dynamic inset values act as one-off safe-zone overrides for any rail.
 */
export function getRailInset(value: unknown, inset?: unknown): string | undefined {
	const railKey = normalizeRail(value);
	if (!railKey) return undefined;

	const explicitInset = resolveInset(inset);
	if (explicitInset) return explicitInset.value;

	const definitionInset = canonicalRails[railKey]?.inset;
	if (definitionInset) return resolveInset(definitionInset)?.value;

	return undefined;
}

export function getRailClassNames(
	value: unknown,
	prefix = "is-rail",
): string {
	const railKey = normalizeRail(value);
	if (!railKey) return "";

	const classNames = new Set<string>([railKey]);
	for (const alias of canonicalRails[railKey]?.aliases ?? []) {
		classNames.add(toRailKey(alias));
	}

	return Array.from(classNames).map((name) => `${prefix}-${name}`).join(" ");
}

export function getRailClassName(value: unknown): string {
	return getRailClassNames(value, "is-rail");
}

/**
 * Rails debug only renders the canonical line system so shorthand aliases do
 * not create duplicate overlays, and mirrored rails share the same short
 * canonical label on both sides.
 */
export function getCanonicalRailDebugLines(): RailDebugLine[] {
	return defaultRailDebugLines.map((line) => ({ ...line }));
}

export function getRailInsetDebugLines(
	value: unknown,
	inset?: unknown,
): RailDebugLine[] {
	const railKey = normalizeRail(value);
	const railInset = getRailInset(railKey, inset);
	if (!railKey || !railInset) return [];

	const explicitInset = resolveInset(inset);
	let label = "";
	if (explicitInset) {
		label = explicitInset.label;
	} else if (canonicalRails[railKey]?.inset) {
		label = railKey;
	}

	if (!label) return [];

	return [
		{
			key: `${railKey}-start`,
			label,
			kind: "inset",
			side: "start",
			inset: railInset,
		},
		{
			key: `${railKey}-end`,
			label,
			kind: "inset",
			side: "end",
			inset: railInset,
		},
	];
}