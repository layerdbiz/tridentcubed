import type * as projectTypes from "./projects.types";

export const storageKey = "survey-report-mvp-v3";

export const exportFormats = ["PDF", "DOCX", "HTML", "MD"] as const;
export type ExportFormatType = (typeof exportFormats)[number];

export type DetailFieldType = {
	key: keyof projectTypes.DetailsFieldsType;
	label: string;
	type?: "text" | "date";
	placeholder?: string;
};

export const overallProgressRingRadius = 38;
export const overallProgressRingCircumference = 2 * Math.PI *
	overallProgressRingRadius;

export const previewPageWidth = 8.5 * 96;
export const previewPageHeight = 11 * 96;

export const previewZoomMin = 0.1;
export const previewZoomMax = 1;

export const previewDesktopPadding = 28;
export const previewMobilePadding = 32;
export const previewMobileGap = 16;
export const previewMobileVisiblePages = 1.5;

export const metricStatusCaptionClass =
	"text-[11px] uppercase tracking-[0.16em]";

export const detailFields: DetailFieldType[] = [
	{ key: "reportTitle", label: "Report Title" },
	{ key: "facilityName", label: "Facility Name" },
	{ key: "startDate", label: "Start Date", type: "date" },
	{ key: "endDate", label: "End Date", type: "date" },
	{ key: "clientName", label: "Client Name" },
	{ key: "preparedBy", label: "Prepared By" },
	{ key: "documentId", label: "Document ID" },
];
