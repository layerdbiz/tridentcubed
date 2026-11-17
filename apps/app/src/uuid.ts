// A browser only has `crypto.randomUUID` on a secure page (https, or localhost). The dev server opened from a phone
// by its network address (http://192.168.1.65:5174) is not one, so every new id threw there and the app sat on its
// loading spinner (Justin's phone, 2026-11-16). `crypto.getRandomValues` works on any page, so the same kind of id
// (a version 4 UUID) is made from it. The deployed app is https and never needs this.

type RandomUuidType = `${string}-${string}-${string}-${string}-${string}`;

/** A version 4 UUID from 16 random bytes. */
export function toUuid(bytes: Uint8Array): RandomUuidType {
	const hex: string[] = [];
	for (const [index, byte] of bytes.subarray(0, 16).entries()) {
		// The version (4) and the variant (10xx) are the only bits that are not random.
		const value = index === 6 ? (byte & 0x0f) | 0x40 : index === 8 ? (byte & 0x3f) | 0x80 : byte;
		hex.push(value.toString(16).padStart(2, '0'));
	}
	const all = hex.join('');
	return `${all.slice(0, 8)}-${all.slice(8, 12)}-${all.slice(12, 16)}-${all.slice(16, 20)}-${all.slice(20)}`;
}

/** Gives `crypto.randomUUID` to a page that lacks it. */
export function ensureRandomUuid(target: Crypto = crypto) {
	if (typeof target.randomUUID === 'function') return;
	target.randomUUID = () => toUuid(target.getRandomValues(new Uint8Array(16)));
}
