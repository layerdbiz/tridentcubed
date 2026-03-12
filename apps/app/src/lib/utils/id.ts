import type { Section, TimeLogSection } from "../types";

let idCounter = 0;

export function nextId(prefix: string): string {
	idCounter += 1;
	return `${prefix}-${idCounter}`;
}

export function syncIdCounterFromSections(items: Section[]): void {
	let maxId = idCounter;

	for (const section of items) {
		for (
			const value of [
				section.id,
				...section.photos.map((photo) => photo.id),
			]
		) {
			const match = value.match(/(\d+)$/);
			if (match) maxId = Math.max(maxId, Number(match[1]));
		}

		if (section.type === "time-log") {
			const timeLog = section as TimeLogSection;
			for (const day of timeLog.days) {
				const dayMatch = day.id.match(/(\d+)$/);
				if (dayMatch) maxId = Math.max(maxId, Number(dayMatch[1]));

				for (const entry of day.entries) {
					const entryMatch = entry.id.match(/(\d+)$/);
					if (entryMatch) maxId = Math.max(maxId, Number(entryMatch[1]));
				}
			}
		}
	}

	idCounter = maxId;
}
