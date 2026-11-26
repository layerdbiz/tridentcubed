// The shell's memory in this browser (#342): each page's controls and which panels are open. A private window or
// blocked storage keeps nothing, and the shell still works.

export function readKept(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

export function keep(key: string, value: string) {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Nothing kept; the controls still work for this visit.
	}
}
