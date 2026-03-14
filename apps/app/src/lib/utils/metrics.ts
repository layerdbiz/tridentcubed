import type { Section, SectionMetrics, SectionStatus } from "../types";
import { detailFields, overallProgressRingCircumference } from "../constants";
import { clamp, toPercent } from "./math";

export function getSectionMetrics(section: Section): SectionMetrics {
	if (section.type === "cover") {
		const done = detailFields.reduce(
			(count, field) =>
				count + (String(section.fields[field.key] || "").trim() ? 1 : 0),
			0,
		);
		const total = detailFields.length;
		return { done, total, percent: toPercent(done, total) };
	}

	if (section.type === "time-log") {
		let done = 0;
		let total = 0;

		for (const day of section.days) {
			total += 1;
			if (String(day.dateISO || "").trim()) done += 1;

			for (const entry of day.entries) {
				total += 2;
				if (String(entry.time || "").trim()) done += 1;
				if (String(entry.text || "").trim()) done += 1;
			}
		}

		const safeTotal = Math.max(1, total);
		return { done, total: safeTotal, percent: toPercent(done, safeTotal) };
	}

	const done = Number(Boolean(section.title.trim())) +
		Number(Boolean(section.description.trim())) +
		Number(section.photos.length > 0);
	const total = 3;
	return { done, total, percent: toPercent(done, total) };
}

export function getOverallMetrics(items: Section[]): SectionMetrics {
	let done = 0;
	let total = 0;

	for (const section of items) {
		const metrics = getSectionMetrics(section);
		done += metrics.done;
		total += metrics.total;
	}

	return { done, total, percent: clamp(toPercent(done, total), 0, 100) };
}

export function getSectionStatus(metrics: SectionMetrics): SectionStatus {
	if (metrics.percent <= 0) return "todo";
	if (metrics.percent >= 100) return "complete";
	return "in-progress";
}

export function getSectionStatusLabel(metrics: SectionMetrics): string {
	const status = getSectionStatus(metrics);
	if (status === "todo") return "TO DO";
	if (status === "complete") return "COMPLETE";
	return "IN PROGRESS";
}

export function getSectionStatusTextClass(metrics: SectionMetrics): string {
	const status = getSectionStatus(metrics);
	if (status === "todo") return "text-neutral-400";
	if (status === "complete") return "text-success-600";
	return "text-info";
}

export function getSectionProgressFillClass(metrics: SectionMetrics): string {
	const status = getSectionStatus(metrics);
	if (status === "todo") return "bg-secondary-300";
	if (status === "complete") return "bg-accent-500";
	return "bg-info";
}

export function getProgressRingOffset(percent: number): number {
	const normalized = clamp(percent, 0, 100);
	return overallProgressRingCircumference * (1 - normalized / 100);
}
