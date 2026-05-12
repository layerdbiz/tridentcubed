export const railSpans: Record<string, string> = {
	"content-xs": "content-xs-start / content-xs-end",
	"content-sm": "content-sm-start / content-sm-end",
	content: "content-md-start / content-md-end",
	"content-md": "content-md-start / content-md-end",
	"content-lg": "content-lg-start / content-lg-end",
	popout: "content-lg-start / content-lg-end",
	"content-xl": "content-xl-start / content-xl-end",
	"content-full": "content-full-start / content-full-end",
	full: "content-full-start / content-full-end",
	bleed: "content-full-start / content-full-end",
	"bleed-left": "content-full-start / content-center",
	"bleed-left-center": "content-full-start / content-center",
	"bleed-left-half": "content-full-start / content-center",
	"bleed-right": "content-center / content-full-end",
	"bleed-right-center": "content-center / content-full-end",
	"bleed-right-half": "content-center / content-full-end",
	"bleed-left-xs": "content-full-start / content-xs-end",
	"bleed-left-sm": "content-full-start / content-sm-end",
	"bleed-left-md": "content-full-start / content-md-end",
	"bleed-left-lg": "content-full-start / content-lg-end",
	"bleed-left-xl": "content-full-start / content-xl-end",
	"bleed-right-xs": "content-xs-start / content-full-end",
	"bleed-right-sm": "content-sm-start / content-full-end",
	"bleed-right-md": "content-md-start / content-full-end",
	"bleed-right-lg": "content-lg-start / content-full-end",
	"bleed-right-xl": "content-xl-start / content-full-end",
};

export function toRailKey(value: unknown): string {
	return String(value)
		.trim()
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.toLowerCase()
		.replace(/[_\s]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function normalizeRail(value: unknown): string {
	const raw = toRailKey(value);
	if (!raw) return "";
	if (raw === "xs") return "content-xs";
	if (raw === "sm") return "content-sm";
	if (raw === "md") return "content-md";
	if (raw === "lg") return "content-lg";
	if (raw === "xl") return "content-xl";
	return railSpans[raw] ? raw : "";
}

export function getRailColumn(value: unknown): string | undefined {
	const railKey = normalizeRail(value);
	return railKey ? railSpans[railKey] : undefined;
}

export function getRailClassName(value: unknown): string {
	const railKey = normalizeRail(value);
	return railKey ? `is-rail-${railKey}` : "";
}
