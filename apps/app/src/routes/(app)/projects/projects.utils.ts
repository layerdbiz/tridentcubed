import { browser } from "$app/environment";

import {
	detailFields,
	overallProgressRingCircumference,
} from "./projects.constants";
import type * as projectTypes from "./projects.types";

let idCounter = 0;

export function nextId(prefix: string): string {
	idCounter += 1;
	return `${prefix}-${idCounter}`;
}

export function syncIdCounterFromSections(
	items: projectTypes.SectionType[],
): void {
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
			const timeLog = section as projectTypes.TimeLogSectionType;
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

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function toPercent(value: number, total: number): number {
	return total ? Math.round((value / total) * 100) : 0;
}

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

export function getSectionMetrics(
	section: projectTypes.SectionType,
): projectTypes.SectionMetricsType {
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

export function getOverallMetrics(
	items: projectTypes.SectionType[],
): projectTypes.SectionMetricsType {
	let done = 0;
	let total = 0;

	for (const section of items) {
		const metrics = getSectionMetrics(section);
		done += metrics.done;
		total += metrics.total;
	}

	return { done, total, percent: clamp(toPercent(done, total), 0, 100) };
}

export function getSectionStatus(
	metrics: projectTypes.SectionMetricsType,
): projectTypes.SectionStatusType {
	if (metrics.percent <= 0) return "todo";
	if (metrics.percent >= 100) return "complete";
	return "in-progress";
}

export function getSectionStatusLabel(
	metrics: projectTypes.SectionMetricsType,
): string {
	const status = getSectionStatus(metrics);
	if (status === "todo") return "TO DO";
	if (status === "complete") return "COMPLETE";
	return "IN PROGRESS";
}

export function getSectionStatusTextClass(
	metrics: projectTypes.SectionMetricsType,
): string {
	const status = getSectionStatus(metrics);
	if (status === "todo") return "text-neutral-400";
	if (status === "complete") return "text-success-600";
	return "text-info";
}

export function getSectionProgressFillClass(
	metrics: projectTypes.SectionMetricsType,
): string {
	const status = getSectionStatus(metrics);
	if (status === "todo") return "bg-secondary-300";
	if (status === "complete") return "bg-accent-500";
	return "bg-info";
}

export function getProgressRingOffset(percent: number): number {
	const normalized = clamp(percent, 0, 100);
	return overallProgressRingCircumference * (1 - normalized / 100);
}

export function getPhotoOrientation(
	photo: projectTypes.PhotoItemType,
): projectTypes.PhotoOrientationType {
	if (!photo.width || !photo.height) return "square";
	if (photo.width / photo.height >= 1.1) return "landscape";
	if (photo.height / photo.width >= 1.1) return "portrait";
	return "square";
}

export function getPreviewPhotoGridClass(
	section: projectTypes.PhotosSectionType,
): string {
	if (section.photos.length <= 1) return "grid gap-3";
	return "grid grid-cols-2 gap-3";
}

export function getPreviewPhotoCardClass(
	_section: projectTypes.PhotosSectionType,
	_photo: projectTypes.PhotoItemType,
): string {
	return "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white";
}

export function getPreviewPhotoFrameHeight(
	section: projectTypes.PhotosSectionType,
	photo: projectTypes.PhotoItemType,
): string {
	const orientation = getPhotoOrientation(photo);

	if (section.photos.length === 1) {
		return orientation === "portrait" ? "5.6in" : "4.7in";
	}

	if (section.photos.length === 2) {
		return orientation === "portrait" ? "3.55in" : "2.45in";
	}

	return orientation === "portrait" ? "2.7in" : "1.9in";
}

export function fileToDataUrl(file: File): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ""));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

export function loadImageDimensions(
	src: string,
): Promise<{ width: number; height: number }> {
	return new Promise<{ width: number; height: number }>((resolve) => {
		if (!browser || !src) {
			resolve({ width: 0, height: 0 });
			return;
		}

		const image = new Image();
		image.onload = () =>
			resolve({
				width: image.naturalWidth || 0,
				height: image.naturalHeight || 0,
			});
		image.onerror = () => resolve({ width: 0, height: 0 });
		image.src = src;
	});
}

export async function createPhotoItem(
	file: File,
): Promise<projectTypes.PhotoItemType> {
	const src = await fileToDataUrl(file);
	const { width, height } = await loadImageDimensions(src);

	return {
		id: nextId("photo"),
		name: file.name || "Photo",
		caption: file.name ? file.name.replace(/\.[^.]+$/, "") : "Photo",
		src,
		width,
		height,
	};
}

export async function hydratePhotoDimensions(
	items: projectTypes.SectionType[],
): Promise<boolean> {
	let changed = false;

	for (const section of items) {
		for (const photo of section.photos) {
			if (photo.width > 0 && photo.height > 0) continue;

			const { width, height } = await loadImageDimensions(photo.src);
			if (!width || !height) continue;

			photo.width = width;
			photo.height = height;
			changed = true;
		}
	}

	return changed;
}
