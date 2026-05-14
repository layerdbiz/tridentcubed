export interface DemoRouteLinkType {
	slug: string;
	href: string;
	title: string;
	description: string;
}

export const demoRouteLinks: DemoRouteLinkType[] = [
	{
		slug: "rails-debug",
		href: "/demo/rails-debug",
		title: "Rails Debug",
		description:
			"Shows the component-scoped rails overlay, canonical line labels, and inset markers without the box-debug crosshair.",
	},
	{
		slug: "rails-aliases",
		href: "/demo/rails-aliases",
		title: "Rails Aliases",
		description:
			"Shows the preferred canonical rails first, then the older names that normalize back to them, including gutter aliases.",
	},
	{
		slug: "rails-widths",
		href: "/demo/rails-widths",
		title: "Rails Widths",
		description:
			"Stacks the preferred rails from xs through gutter and full so the responsive width model is easy to compare.",
	},
	{
		slug: "rails-insets",
		href: "/demo/rails-insets",
		title: "Rails Gutters + Insets",
		description:
			"Teaches gutter rails first, then content safe-zone inset and one-off full inset values.",
	},
];

export function getDemoRoute(slug: string): DemoRouteLinkType | undefined {
	return demoRouteLinks.find((route) => route.slug === slug);
}
