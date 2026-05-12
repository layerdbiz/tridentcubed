export interface TrackEventOptions {
	name: string;
	location?: string;
	label?: string;
	href?: string;
	debug?: boolean;
}

type GtagFunction = (
	command: string,
	target: string | Date,
	params?: Record<string, unknown>,
) => void;

type TrackEventHandler = (event?: MouseEvent) => void;

export function trackEvent({
	name,
	location,
	label,
	href,
	debug = false,
}: TrackEventOptions): TrackEventHandler {
	return () => {
		if (typeof window === "undefined") {
			return;
		}

		const resolvedGtag = (window as Window & { gtag?: GtagFunction }).gtag;

		if (typeof resolvedGtag !== "function") {
			return;
		}

		const params: Record<string, unknown> = {
			transport_type: "beacon",
		};

		if (location) {
			params.location = location;
		}

		if (label) {
			params.label = label;
		}

		if (href) {
			params.href = href;
		}

		if (debug) {
			params.debug_mode = true;
		}

		resolvedGtag("event", name, params);
	};
}
