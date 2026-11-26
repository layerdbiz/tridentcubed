// Which options the open page shows (#342), so the menu can mark the file that is open. The board writes it as the
// controls change; the address alone cannot say it, because the board writes the address past the router.
const current = $state({ views: [] as string[] });

export function readViews(): string[] {
	return current.views;
}

export function setViews(views: string[]) {
	current.views = views;
}
