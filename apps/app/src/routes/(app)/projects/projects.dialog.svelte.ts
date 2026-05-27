import { persistJson as persist } from "@layerd/ui";

const previewIntroDismissPersist = persist.json<boolean>({
	key: "projects.preview-intro-dismissed",
	fallback: false,
	validate: (value): value is boolean => typeof value === "boolean",
});

export const previewIntroState = $state({
	isOpen: false,
	reopenRequested: false,
});

export function initializePreviewIntro() {
	previewIntroState.isOpen = previewIntroState.reopenRequested ||
		!previewIntroDismissPersist.current;
	previewIntroState.reopenRequested = false;
}

export function openPreviewIntro() {
	previewIntroState.reopenRequested = true;
	previewIntroState.isOpen = true;
}

export function dismissPreviewIntro() {
	previewIntroDismissPersist.current = true;
	previewIntroState.reopenRequested = false;
	previewIntroState.isOpen = false;
}
