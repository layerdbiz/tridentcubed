export function slugify(value: string): string {
	return (
		value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "survey-report"
	);
}

export function formatDayDate(dateISO: string): string {
	if (!dateISO) return "";

	const [year, month, day] = String(dateISO)
		.split("-")
		.map((value) => Number(value));
	if (!year || !month || !day) return "";

	const date = new Date(year, month - 1, day);
	const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" })
		.format(date);
	const numeric = new Intl.DateTimeFormat(undefined, {
		month: "numeric",
		day: "numeric",
		year: "numeric",
	}).format(date);

	return `${weekday}, ${numeric}`;
}
