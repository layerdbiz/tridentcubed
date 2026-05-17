export type NavLink = {
	href: string;
	label: string;
};

export type NavItem = NavLink & {
	children?: NavLink[];
};

export type NavSection = {
	label: string;
	items: NavItem[];
};

type RouteMeta = NavLink & {
	group: string;
};

const routes = import.meta.glob("/src/routes/**/+page.svelte");

export const navSections = getNavSections(getRouteList(Object.keys(routes)));

function getRouteList(filePaths: string[]): RouteMeta[] {
	const routes: RouteMeta[] = [];

	for (const filePath of filePaths) {
		const route = toRouteMeta(filePath);
		if (route) routes.push(route);
	}

	return routes;
}

function toRouteMeta(filePath: string): RouteMeta | null {
	const routePath = filePath.replace("/src/routes/", "").replace(
		"/+page.svelte",
		"",
	);
	const rawSegments = routePath.split("/").filter(Boolean);

	if (rawSegments.some((segment) => segment.startsWith("["))) return null;

	const group = rawSegments.find(isRouteGroup)?.slice(1, -1) ?? "routes";
	const segments = rawSegments.filter((segment) => !isRouteGroup(segment));
	const href = `/${segments.join("/")}`.replace(/\/$/, "") || "/";
	const label = href === "/" ? "Home" : toLabel(segments.at(-1) ?? "");

	return { href, label, group };
}

function isRouteGroup(segment: string): boolean {
	return segment.startsWith("(") && segment.endsWith(")");
}

function toLabel(value: string): string {
	return value.replaceAll("-", " ").replace(
		/\b\w/g,
		(letter) => letter.toUpperCase(),
	);
}

function getNavSections(routes: RouteMeta[]): NavSection[] {
	const sections: NavSection[] = [];
	const mqRoutes = getGroupRoutes(routes, "mq");
	const playRoutes = getGroupRoutes(routes, "play");
	const otherRoutes = routes.filter((route) =>
		route.group !== "mq" && route.group !== "play"
	).sort(sortRoutes);

	if (mqRoutes.length) {
		sections.push({ label: "MQ", items: toNavItems(mqRoutes) });
	}
	if (playRoutes.length) {
		sections.push({ label: "Play", items: getPlayItems(playRoutes) });
	}
	if (otherRoutes.length) {
		sections.push({ label: "Other", items: toNavItems(otherRoutes) });
	}

	return sections;
}

function getGroupRoutes(routes: RouteMeta[], group: string): RouteMeta[] {
	return routes.filter((route) => route.group === group).sort(sortRoutes);
}

function getPlayItems(routes: RouteMeta[]): NavItem[] {
	const items: NavItem[] = [];
	const used = new Set<string>();

	addRoute(items, used, routes.find((route) => route.href === "/"));
	addDemoRoutes(items, used, routes);
	addRoute(items, used, routes.find((route) => route.href === "/features"));
	addRoute(items, used, routes.find((route) => route.href === "/grid"));

	for (const route of routes) {
		if (!used.has(route.href)) addRoute(items, used, route);
	}

	return items;
}

function addDemoRoutes(
	items: NavItem[],
	used: Set<string>,
	routes: RouteMeta[],
): void {
	const demo = routes.find((route) => route.href === "/demo");
	const children = routes.filter((route) => route.href.startsWith("/demo/"))
		.sort(sortRoutes);

	if (!demo && !children.length) return;

	items.push({
		href: demo?.href ?? "/demo",
		label: demo?.label ?? "Demo",
		children: children.map(toNavItem),
	});

	used.add("/demo");

	for (const child of children) {
		used.add(child.href);
	}
}

function addRoute(
	items: NavItem[],
	used: Set<string>,
	route?: RouteMeta,
): void {
	if (!route) return;

	items.push(toNavItem(route));
	used.add(route.href);
}

function toNavItems(routes: RouteMeta[]): NavItem[] {
	const items: NavItem[] = [];

	for (const route of routes) {
		items.push(toNavItem(route));
	}

	return items;
}

function toNavItem(route: RouteMeta): NavItem {
	return {
		href: route.href,
		label: route.label,
	};
}

function sortRoutes(a: RouteMeta, b: RouteMeta): number {
	if (a.href === "/") return -1;
	if (b.href === "/") return 1;

	return a.href.localeCompare(b.href);
}
