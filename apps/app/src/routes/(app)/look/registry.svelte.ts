// PROTOTYPE (#161) run 15: the customer and people registries in look.data.ts are plain lookups by name, which a
// logo or an avatar reads without knowing the page's state. An uploaded logo or photo changes them, so they count
// their changes here: a lookup reads the count (`seen`), a change bumps it (`touch`), and whatever drew the old
// picture draws the new one.
let version = $state(0);

export function seen() {
	return version;
}

export function touch() {
	version += 1;
}
