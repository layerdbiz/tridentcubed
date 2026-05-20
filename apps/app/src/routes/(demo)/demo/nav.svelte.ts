export const DEMO_VIEW_PARAM = "view";

export type DemoViewType = "demo" | "code";

export type DemoNavItemType = {
	view: DemoViewType;
	label: string;
	description: string;
};

export const demoNavItems: DemoNavItemType[] = [
	{
		view: "demo",
		label: "Demo",
		description:
			"Live route output using the shared Layerd UI field components.",
	},
	{
		view: "code",
		label: "Code",
		description: "The current +page.svelte source for this route.",
	},
];

export function getDemoView(value: string | null): DemoViewType {
	return value === "code" ? "code" : "demo";
}

export function getDemoViewHref(url: URL, view: DemoViewType): string {
	const nextUrl = new URL(url);

	if (view === "demo") {
		nextUrl.searchParams.delete(DEMO_VIEW_PARAM);
	} else {
		nextUrl.searchParams.set(DEMO_VIEW_PARAM, view);
	}

	return nextUrl.pathname + nextUrl.search + nextUrl.hash;
}
